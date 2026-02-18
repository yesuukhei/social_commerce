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

const { Store, Product, Customer, Conversation, Order } = require("../models");

/**
 * Handle Incoming Messages (POST request from Facebook)
 * This is called when a customer sends a message
 */
exports.handleWebhook = async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    res.status(200).send("EVENT_RECEIVED");

    try {
      await Promise.all(
        body.entry.map(async (entry) => {
          const pageId = entry.id; // Correct way to get Page ID in webhook entries
          const webhookEvent = entry.messaging[0];
          const senderPsid = webhookEvent.sender.id;

          console.log(
            `📨 Message for Page: ${pageId} from Sender: ${senderPsid}`,
          );

          // 1. Find Store
          let store = await Store.findOne({ facebookPageId: pageId });

          // Seed a default store if none exists and we have env vars (Migration helper)
          if (!store && pageId === process.env.FACEBOOK_PAGE_ID) {
            store = new Store({
              name: "Default Shop",
              facebookPageId: process.env.FACEBOOK_PAGE_ID,
              facebookPageToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
              googleSheetId: process.env.GOOGLE_SHEET_ID,
            });
            await store.save();
          }

          if (!store) {
            console.error(`❌ Store not found for Page ID: ${pageId}`);
            return;
          }

          // 2. Load Catalog (Products)
          const catalog = await Product.find({
            store: store._id,
            isActive: true,
          });

          // 3. Process Event
          if (webhookEvent.message) {
            await handleMessage(
              senderPsid,
              webhookEvent.message,
              store,
              catalog,
            );
          } else if (webhookEvent.postback) {
            await handlePostback(
              senderPsid,
              webhookEvent.postback,
              store,
              catalog,
            );
          }
        }),
      );
    } catch (error) {
      console.error("❌ Error processing entries:", error);
    }
  } else {
    res.sendStatus(404);
  }
};

/**
 * Handle incoming text messages
 */
async function handleMessage(senderPsid, receivedMessage, store, catalog) {
  try {
    let response;

    if (receivedMessage.text) {
      const messageText = receivedMessage.text;
      console.log(`💬 Message [${store.name}]: ${messageText}`);

      // Find or create customer
      const customer = await findOrCreateCustomer(senderPsid, store);

      // Find or create conversation
      let conversation = await Conversation.findOne({
        facebookConversationId: senderPsid,
        customer: customer._id,
      });

      if (!conversation) {
        conversation = new Conversation({
          customer: customer._id,
          facebookConversationId: senderPsid,
          currentIntent: "browsing",
        });
      }

      const history = conversation.messages.slice(-5);
      await conversation.addMessage("customer", messageText);

      await messengerService.sendTypingIndicator(
        senderPsid,
        true,
        store.facebookPageToken,
      );

      // Process message with Unified AI and Store Catalog
      const aiResult = await aiService.processMessage(
        messageText,
        history,
        catalog,
      );

      conversation.currentIntent = aiResult.intent || "browsing";

      if (
        aiResult.intent === "ordering" &&
        aiResult.isOrderReady &&
        aiResult.confidence > 0.6
      ) {
        const orderData = {
          store: store._id, // Linked to current store
          customer: customer._id,
          conversation: conversation._id,
          phoneNumber: aiResult.data.phone || "99999999",
          address: aiResult.data.full_address || "Хаяг тодорхойгүй",
          items: aiResult.data.items.map((item) => ({
            itemName: item.name || "Бараа",
            quantity: item.quantity || 1,
            price: item.price || 0,
            attributes: item.attributes || {},
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

        const order = new Order(orderData);
        await order.save(); // This triggers the pre-save total calculation
        console.log(`✅ Order created for ${store.name}: ${order._id}`);

        // Inventory Update (Two-Way Sync)
        for (const item of order.items) {
          const product = await Product.findOne({
            store: store._id,
            name: item.itemName,
          });
          if (product) {
            product.stock = Math.max(0, product.stock - item.quantity);
            await product.save();

            // Sync back to Google Sheets
            googleSheetsService
              .updateProductStock(
                store.googleSheetId,
                product.name,
                product.stock,
              )
              .catch((err) =>
                console.error(
                  "❌ Sheets inventory update failed:",
                  err.message,
                ),
              );
          }
        }

        const populatedOrder = await Order.findById(order._id).populate(
          "customer",
        );
        googleSheetsService
          .appendOrder(populatedOrder, store.googleSheetId)
          .catch((err) =>
            console.error("❌ Google Sheets sync failed:", err.message),
          );

        // Pass the saved 'order' to generate a detailed confirmation
        const replyText = await aiService.generateResponse(
          aiResult,
          messageText,
          order,
        );
        response = { text: replyText };
        conversation.status = "order_created";
      } else {
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
      await conversation.addMessage("bot", response.text);
      await messengerService.sendTypingIndicator(
        senderPsid,
        false,
        store.facebookPageToken,
      );
      await messengerService.sendMessage(
        senderPsid,
        response,
        store.facebookPageToken,
      );
    } else if (receivedMessage.attachments) {
      response = {
        text: "📷 Зураг хүлээн авлаа! Захиалгын мэдээллээ текстээр илгээнэ үү.",
      };
      await messengerService.sendMessage(
        senderPsid,
        response,
        store.facebookPageToken,
      );
    }
  } catch (error) {
    console.error("❌ Error handling message:", error);
    try {
      await messengerService.sendMessage(
        senderPsid,
        {
          text: "😔 Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.",
        },
        store.facebookPageToken,
      );
    } catch (sendError) {}
  }
}

/**
 * Handle postback events
 */
async function handlePostback(senderPsid, receivedPostback, store, catalog) {
  try {
    const payload = receivedPostback.payload;
    let response;

    switch (payload) {
      case "GET_STARTED":
        response = {
          text: `👋 Тавтай морил! Би ${store.name}-ийн туслах бот байна.`,
        };
        break;
      default:
        response = { text: "Тодорхойгүй команд байна." };
    }

    await messengerService.sendMessage(
      senderPsid,
      response,
      store.facebookPageToken,
    );
  } catch (error) {
    console.error("❌ Error handling postback:", error);
  }
}

/**
 * Find or create customer
 */
async function findOrCreateCustomer(facebookId, store) {
  try {
    let customer = await Customer.findOne({ facebookId });

    if (!customer) {
      const userInfo = await messengerService.getUserInfo(
        facebookId,
        store.facebookPageToken,
      );
      customer = new Customer({
        facebookId,
        name: userInfo.name || "Unknown User",
      });
      await customer.save();
    }
    return customer;
  } catch (error) {
    console.error("❌ Error finding/creating customer:", error);
    throw error;
  }
}
