# 🤖 Facebook Messenger Webhook Setup Guide

## ✅ What We've Built

The webhook integration is now complete! Here's what's included:

### Files Created:

1. ✅ `routes/webhook.js` - Webhook endpoints
2. ✅ `controllers/webhookController.js` - Message handling logic
3. ✅ `services/messengerService.js` - Facebook API integration
4. ✅ `services/aiService.js` - OpenAI integration for Mongolian text

### Features:

- ✅ Webhook verification (GET endpoint)
- ✅ Message receiving (POST endpoint)
- ✅ AI-powered order extraction from Mongolian text
- ✅ Conversation tracking
- ✅ Customer management
- ✅ Typing indicators
- ✅ Smart responses

---

## 🚀 Setup Instructions

### Step 1: Update Environment Variables

Open your `.env` file and add real values:

```env
# OpenAI API Key (Required for AI extraction)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Facebook Messenger (Get from Facebook Developer Portal)
FACEBOOK_PAGE_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxx
FACEBOOK_VERIFY_TOKEN=my_custom_secret_token_12345
FACEBOOK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get these:**

- **OPENAI_API_KEY**: https://platform.openai.com/api-keys
- **FACEBOOK_PAGE_ACCESS_TOKEN**: Facebook Developer Portal (see Step 2)
- **FACEBOOK_VERIFY_TOKEN**: Create your own random string (e.g., "my_secret_token_2026")
- **FACEBOOK_APP_SECRET**: Facebook Developer Portal

---

### Step 2: Create Facebook App

1. **Go to Facebook Developers**: https://developers.facebook.com/
2. **Create New App**:
   - Click "Create App"
   - Choose "Business" type
   - App Name: "Smart Order Bot" (or your choice)
   - Click "Create App"

3. **Add Messenger Product**:
   - In dashboard, click "Add Product"
   - Find "Messenger" and click "Set Up"

4. **Connect Your Facebook Page**:
   - In Messenger settings, find "Access Tokens"
   - Click "Add or Remove Pages"
   - Select your business page
   - Copy the "Page Access Token" → paste in `.env` as `FACEBOOK_PAGE_ACCESS_TOKEN`

5. **Get App Secret**:
   - Go to Settings → Basic
   - Copy "App Secret" → paste in `.env` as `FACEBOOK_APP_SECRET`

---

### Step 3: Deploy Your Server (Required for Webhook)

Facebook needs a **public HTTPS URL** to send messages to. You have 3 options:

#### Option A: Use ngrok (For Testing - Easiest)

```bash
# Install ngrok
brew install ngrok

# Start your server
npm run dev

# In another terminal, expose port 4005
ngrok http 4005
```

You'll get a URL like: `https://abc123.ngrok.io`

#### Option B: Deploy to Railway (Recommended for Production)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

You'll get a URL like: `https://your-app.railway.app`

#### Option C: Deploy to Render/Heroku/AWS

Follow their deployment guides. Make sure your app is accessible via HTTPS.

---

### Step 4: Setup Facebook Webhook

1. **Go to Messenger Settings** in your Facebook App
2. **Find "Webhooks" section**
3. **Click "Add Callback URL"**:
   - **Callback URL**: `https://your-domain.com/api/webhook`
     - Example: `https://abc123.ngrok.io/api/webhook`
   - **Verify Token**: Use the same token from your `.env` (`FACEBOOK_VERIFY_TOKEN`)
   - Click "Verify and Save"

4. **Subscribe to Webhook Fields**:
   - Check these boxes:
     - ✅ `messages`
     - ✅ `messaging_postbacks`
     - ✅ `message_deliveries`
     - ✅ `message_reads`
   - Click "Save"

5. **Subscribe Your Page**:
   - In "Webhooks" section, find your page
   - Click "Subscribe"

---

### Step 5: Test Your Bot

1. **Go to your Facebook Page**
2. **Send a message** to your page:

```
2 ширхэг цамц авмаар байна
99119911
Баянзүрх дүүрэг, 1-р хороо
```

3. **Check your server logs** - you should see:

```
📨 Received message from sender: 123456789
💬 Message text: 2 ширхэг цамц авмаар байна...
🤖 AI Extraction Result: {...}
✅ Message sent successfully
```

4. **Bot should reply** with order confirmation!

---

## 🧪 Testing Locally

### Test Webhook Verification (GET)

```bash
curl "http://localhost:4005/api/webhook?hub.mode=subscribe&hub.verify_token=my_custom_secret_token_12345&hub.challenge=test123"
```

Expected response: `test123`

### Test Message Handling (POST)

```bash
curl -X POST http://localhost:4005/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": {"id": "test_user_123"},
        "message": {
          "text": "2 ширхэг цамц авмаар байна, 99119911, БЗД"
        }
      }]
    }]
  }'
```

---

## 📊 Monitor Your Bot

### Check Server Logs

Your server will log:

- 📨 Incoming messages
- 🤖 AI extraction results
- ✅ Sent messages
- ❌ Errors

### Check Database

```bash
# Connect to MongoDB and check data
mongosh "your_mongodb_uri"

# View customers
db.customers.find().pretty()

# View conversations
db.conversations.find().pretty()
```

---

## 🐛 Troubleshooting

### Problem: Webhook verification fails

**Solution**: Make sure:

- Your server is running and accessible via HTTPS
- `FACEBOOK_VERIFY_TOKEN` in `.env` matches the token in Facebook settings
- The webhook URL is correct: `https://your-domain.com/api/webhook`

### Problem: Not receiving messages

**Solution**: Check:

- Webhook is subscribed to your page
- Page Access Token is valid
- Server logs for errors
- Facebook App is not in "Development Mode" (or add test users)

### Problem: AI extraction not working

**Solution**: Verify:

- `OPENAI_API_KEY` is valid and has credits
- Check server logs for AI errors
- Test with simpler messages first

### Problem: Bot not responding

**Solution**: Check:

- `FACEBOOK_PAGE_ACCESS_TOKEN` is valid
- Server can reach Facebook API (check firewall)
- No errors in server logs

---

## 🎯 Next Steps

Now that webhook is working, you can:

1. ✅ **Create Order Management API** - Save orders to database
2. ✅ **Build Admin Dashboard** - View and manage orders
3. ✅ **Add Google Sheets Export** - Auto-sync orders
4. ✅ **Improve AI Prompts** - Better Mongolian understanding

---

## 📝 Example Conversations

### Example 1: Complete Order

**User**: "2 ширхэг цамц авмаар байна, 99119911, Баянзүрх дүүрэг"

**Bot**:

```
✅ Баярлалаа! Таны захиалгыг хүлээн авлаа.

📦 Бараа: цамц
📞 Утас: 99119911
📍 Хаяг: Баянзүрх дүүрэг

Манай ажилтан удахгүй холбогдох болно! 🙏
```

### Example 2: Missing Information

**User**: "цамц авмаар байна"

**Bot**:

```
🤔 Захиалга өгөхийн тулд дараах мэдээллийг өгнө үү:

📞 Утасны дугаараа өгнө үү?
📍 Хаягаа өгнө үү?
```

### Example 3: General Inquiry

**User**: "Сайн уу"

**Bot**:

```
👋 Сайн байна уу! Захиалга өгөхийг хүсвэл дараах мэдээллийг илгээнэ үү:

📦 Бараа
🔢 Тоо ширхэг
📞 Утасны дугаар
📍 Хүргэх хаяг

Жишээ: "2 ширхэг цамц авмаар байна, 99119911, Баянзүрх дүүрэг"
```

---

## 🔐 Security Notes

- ✅ Never commit `.env` file to git
- ✅ Use environment variables for all secrets
- ✅ Enable rate limiting (already configured)
- ✅ Validate webhook signature (TODO: implement)
- ✅ Use HTTPS in production

---

## 📚 Useful Links

- [Facebook Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [ngrok Documentation](https://ngrok.com/docs)
- [Railway Deployment Guide](https://docs.railway.app/)

---

**Status**: ✅ Webhook Integration Complete!  
**Last Updated**: 2026-01-31
