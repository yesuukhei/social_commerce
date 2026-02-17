const Customer = require("../models/Customer");
const Conversation = require("../models/Conversation");
const Order = require("../models/Order");
const messengerService = require("../services/messengerService");
const aiService = require("../services/aiService");
const googleSheetsService = require("../services/googleSheetsService");

/**
 * Webhook Verification (GET request from Facebook)
 * Facebook will call this endpoint to verify your webhook
 */
exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

  // Parse params from the webhook verification request
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log("✅ Webhook verified successfully!");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      console.error("❌ Webhook verification failed - Invalid token");
      res.sendStatus(403);
    }
  } else {
    console.error("❌ Webhook verification failed - Missing parameters");
    res.sendStatus(400);
  }
};

/**
 * Handle Incoming Messages (POST request from Facebook)
 * This is called when a customer sends a message
 */
exports.handleWebhook = async (req, res) => {
  const body = req.body;

  // Check if this is an event from a page subscription
  if (body.object === "page") {
    // Return 200 OK immediately to Facebook
    res.status(200).send("EVENT_RECEIVED");

    // Process each entry (can be multiple if batched)
    try {
      await Promise.all(
        body.entry.map(async (entry) => {
          // Get the webhook event
          const webhookEvent = entry.messaging[0];

          // Get the sender PSID (Page-Scoped ID)
          const senderPsid = webhookEvent.sender.id;

          console.log(`📨 Received message from sender: ${senderPsid}`);

          // Check if the event is a message or postback
          if (webhookEvent.message) {
            await handleMessage(senderPsid, webhookEvent.message);
          } else if (webhookEvent.postback) {
            await handlePostback(senderPsid, webhookEvent.postback);
          }
        }),
      );
    } catch (error) {
      console.error("❌ Error processing entries:", error);
    }
  } else {
    // Return 404 Not Found if event is not from a page subscription
    res.sendStatus(404);
  }
};

/**
 * Handle incoming text messages
 */
async function handleMessage(senderPsid, receivedMessage) {
  try {
    let response;

    // Check if the message contains text
    if (receivedMessage.text) {
      const messageText = receivedMessage.text;
      console.log(`💬 Message text: ${messageText}`);

      // Find or create customer
      const customer = await findOrCreateCustomer(senderPsid);

      // Find or create conversation
      let conversation = await Conversation.findOne({
        facebookConversationId: senderPsid,
      });

      if (!conversation) {
        conversation = new Conversation({
          customer: customer._id,
          facebookConversationId: senderPsid,
          currentIntent: "browsing",
        });
      }

      // Get brief history (last 5 messages) for AI context
      const history = conversation.messages.slice(-5);

      // Add customer message to conversation
      await conversation.addMessage("customer", messageText);

      // Send typing indicator
      await messengerService.sendTypingIndicator(senderPsid, true);

      // Process message with Unified AI
      const aiResult = await aiService.processMessage(messageText, history);

      // Update conversation intent
      conversation.currentIntent = aiResult.intent || "browsing";

      // Check if AI detected an order readiness
      if (
        aiResult.intent === "ordering" &&
        aiResult.isOrderReady &&
        aiResult.confidence > 0.6
      ) {
        // Prepare order data with MULTIPLE items
        const orderData = {
          customer: customer._id,
          conversation: conversation._id,
          phoneNumber: aiResult.data.phone || "99999999",
          address: aiResult.data.full_address || "Хаяг тодорхойгүй",
          items: aiResult.data.items.map((item) => ({
            itemName: item.name || "Бараа",
            quantity: item.quantity || 1,
            price: 0, // Default
          })),
          totalAmount: 0,
          aiExtraction: {
            rawMessage: messageText,
            extractedData: aiResult.data,
            confidence: aiResult.confidence,
            needsReview: !aiResult.data.phone || !aiResult.data.full_address,
          },
          status: "pending",
        };

        // Create and save Order
        const order = new Order(orderData);
        await order.save();
        console.log(`✅ Order created in DB: ${order._id}`);

        // Sync to Google Sheets (Async)
        const populatedOrder = await Order.findById(order._id).populate(
          "customer",
        );
        googleSheetsService
          .appendOrder(populatedOrder)
          .catch((err) =>
            console.error("❌ Google Sheets sync failed:", err.message),
          );

        // Generate Confirmation Response
        const replyText = await aiService.generateResponse(
          aiResult,
          messageText,
        );
        response = { text: replyText };

        // Update conversation status
        conversation.status = "order_created";
        conversation.aiContext = aiResult;
      } else {
        // Handle inquiry, browsing, or missing info
        const replyText = await aiService.generateResponse(
          aiResult,
          messageText,
        );
        response = { text: replyText };

        if (aiResult.intent === "ordering" && !aiResult.isOrderReady) {
          conversation.status = "waiting_for_info";
        }
      }

      await conversation.save();

      // Add bot response to conversation
      await conversation.addMessage("bot", response.text);

      // Turn off typing indicator
      await messengerService.sendTypingIndicator(senderPsid, false);

      // Send the response message
      await messengerService.sendMessage(senderPsid, response);
    } else if (receivedMessage.attachments) {
      // Handle attachments (images, etc.)
      response = {
        text: "📷 Зураг хүлээн авлаа! Захиалгын мэдээллээ текстээр илгээнэ үү.",
      };
      await messengerService.sendMessage(senderPsid, response);
    }
  } catch (error) {
    console.error("❌ Error handling message:", error);

    // Send error message to user - wrapped in try-catch to prevent crash on invalid PSID
    try {
      await messengerService.sendMessage(senderPsid, {
        text: "😔 Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.",
      });
    } catch (sendError) {
      console.error(
        "❌ Failed to send error message to user:",
        sendError.message,
      );
    }
  }
}

/**
 * Handle postback events (button clicks)
 */
async function handlePostback(senderPsid, receivedPostback) {
  try {
    const payload = receivedPostback.payload;
    console.log(`🔘 Postback received: ${payload}`);

    let response;

    // Handle different postback payloads
    switch (payload) {
      case "GET_STARTED":
        response = {
          text: "👋 Тавтай морил! Би таны захиалгыг хүлээн авах туслах бот юм. Захиалга өгөхийг хүсвэл мэдээллээ илгээнэ үү!",
        };
        break;
      case "VIEW_CATALOG":
        response = {
          text: "📦 Манай бүтээгдэхүүнүүдийг үзэхийг хүсвэл холбоо барина уу!",
        };
        break;
      default:
        response = {
          text: "Тодорхойгүй команд байна.",
        };
    }

    await messengerService.sendMessage(senderPsid, response);
  } catch (error) {
    console.error("❌ Error handling postback:", error);
  }
}

/**
 * Find or create customer in database
 */
async function findOrCreateCustomer(facebookId) {
  try {
    let customer = await Customer.findOne({ facebookId });

    if (!customer) {
      // Get user info from Facebook
      const userInfo = await messengerService.getUserInfo(facebookId);

      customer = new Customer({
        facebookId,
        name: userInfo.name || "Unknown User",
      });

      await customer.save();
      console.log(`✅ New customer created: ${customer.name}`);
    } else {
      console.log(`👤 Existing customer found: ${customer.name}`);
    }

    return customer;
  } catch (error) {
    console.error("❌ Error finding/creating customer:", error);
    throw error;
  }
}
