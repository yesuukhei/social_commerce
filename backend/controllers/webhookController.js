const Customer = require('../models/Customer');
const Conversation = require('../models/Conversation');
const messengerService = require('../services/messengerService');
const aiService = require('../services/aiService');

/**
 * Webhook Verification (GET request from Facebook)
 * Facebook will call this endpoint to verify your webhook
 */
exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

  // Parse params from the webhook verification request
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('✅ Webhook verified successfully!');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      console.error('❌ Webhook verification failed - Invalid token');
      res.sendStatus(403);
    }
  } else {
    console.error('❌ Webhook verification failed - Missing parameters');
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
  if (body.object === 'page') {
    // Return 200 OK immediately to Facebook
    res.status(200).send('EVENT_RECEIVED');

    // Process each entry (can be multiple if batched)
    body.entry.forEach(async (entry) => {
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
    });
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
          currentIntent: 'ordering',
        });
      }

      // Add customer message to conversation
      await conversation.addMessage('customer', messageText);

      // Send typing indicator
      await messengerService.sendTypingIndicator(senderPsid, true);

      // Process message with AI to detect if it's an order
      const aiResult = await aiService.extractOrderFromMessage(messageText);

      console.log('🤖 AI Extraction Result:', JSON.stringify(aiResult, null, 2));

      // Check if AI detected an order
      if (aiResult.isOrder && aiResult.confidence > 0.6) {
        // Create order (will be handled in Phase 2)
        response = {
          text: `✅ Баярлалаа! Таны захиалгыг хүлээн авлаа.\n\n📦 Бараа: ${aiResult.data.item_name || 'Тодорхойгүй'}\n📞 Утас: ${aiResult.data.phone_number || 'Тодорхойгүй'}\n📍 Хаяг: ${aiResult.data.address || 'Тодорхойгүй'}\n\nМанай ажилтан удахгүй холбогдох болно! 🙏`,
        };

        // Update conversation intent
        conversation.currentIntent = 'order_created';
        conversation.aiContext = aiResult;
        await conversation.save();

        // TODO: Create Order in database (Phase 2)
      } else if (aiResult.needsMoreInfo) {
        // Ask for missing information
        const missingFields = aiResult.missingFields || [];
        let askText = '🤔 Захиалга өгөхийн тулд дараах мэдээллийг өгнө үү:\n\n';
        
        if (missingFields.includes('item_name')) {
          askText += '📦 Ямар бараа авах вэ?\n';
        }
        if (missingFields.includes('phone_number')) {
          askText += '📞 Утасны дугаараа өгнө үү?\n';
        }
        if (missingFields.includes('address')) {
          askText += '📍 Хаягаа өгнө үү?\n';
        }

        response = { text: askText };
        conversation.status = 'waiting_for_info';
        await conversation.save();
      } else {
        // General inquiry or browsing
        response = {
          text: '👋 Сайн байна уу! Захиалга өгөхийг хүсвэл дараах мэдээллийг илгээнэ үү:\n\n📦 Бараа\n🔢 Тоо ширхэг\n📞 Утасны дугаар\n📍 Хүргэх хаяг\n\nЖишээ: "2 ширхэг цамц авмаар байна, 99119911, Баянзүрх дүүрэг"',
        };
      }

      // Add bot response to conversation
      await conversation.addMessage('bot', response.text);

      // Turn off typing indicator
      await messengerService.sendTypingIndicator(senderPsid, false);

      // Send the response message
      await messengerService.sendMessage(senderPsid, response);
    } else if (receivedMessage.attachments) {
      // Handle attachments (images, etc.)
      response = {
        text: '📷 Зураг хүлээн авлаа! Захиалгын мэдээллээ текстээр илгээнэ үү.',
      };
      await messengerService.sendMessage(senderPsid, response);
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    
    // Send error message to user
    await messengerService.sendMessage(senderPsid, {
      text: '😔 Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.',
    });
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
      case 'GET_STARTED':
        response = {
          text: '👋 Тавтай морил! Би таны захиалгыг хүлээн авах туслах бот юм. Захиалга өгөхийг хүсвэл мэдээллээ илгээнэ үү!',
        };
        break;
      case 'VIEW_CATALOG':
        response = {
          text: '📦 Манай бүтээгдэхүүнүүдийг үзэхийг хүсвэл холбоо барина уу!',
        };
        break;
      default:
        response = {
          text: 'Тодорхойгүй команд байна.',
        };
    }

    await messengerService.sendMessage(senderPsid, response);
  } catch (error) {
    console.error('❌ Error handling postback:', error);
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
        name: userInfo.name || 'Unknown User',
      });

      await customer.save();
      console.log(`✅ New customer created: ${customer.name}`);
    } else {
      console.log(`👤 Existing customer found: ${customer.name}`);
    }

    return customer;
  } catch (error) {
    console.error('❌ Error finding/creating customer:', error);
    throw error;
  }
}
