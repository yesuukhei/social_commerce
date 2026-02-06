#!/bin/bash

# Test script for webhook functionality
# This simulates Facebook sending a message to your webhook

echo "🧪 Testing Webhook Integration..."
echo ""

# Test 1: Webhook Verification (GET)
echo "Test 1: Webhook Verification"
echo "=============================="
VERIFY_RESPONSE=$(curl -s "http://localhost:4005/api/webhook?hub.mode=subscribe&hub.verify_token=your_custom_verify_token&hub.challenge=test_challenge_123")

if [ "$VERIFY_RESPONSE" == "test_challenge_123" ]; then
  echo "✅ Webhook verification PASSED"
else
  echo "❌ Webhook verification FAILED"
  echo "Response: $VERIFY_RESPONSE"
fi

echo ""
echo ""

# Test 2: Simulated Message from Facebook (POST)
echo "Test 2: Incoming Message Handler"
echo "================================="
echo "Sending test message: '2 ширхэг цамц авмаар байна, 99119911, БЗД'"
echo ""

curl -X POST http://localhost:4005/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": {"id": "test_user_12345"},
        "message": {
          "text": "2 ширхэг цамц авмаар байна, 99119911, Баянзүрх дүүрэг"
        }
      }]
    }]
  }'

echo ""
echo ""
echo "✅ Test completed! Check your server logs for details."
echo ""
echo "📝 Note: The bot won't actually send a message back because"
echo "   FACEBOOK_PAGE_ACCESS_TOKEN is not set yet."
echo ""
echo "Next steps:"
echo "1. Get OpenAI API key from https://platform.openai.com"
echo "2. Get Facebook credentials from https://developers.facebook.com"
echo "3. Update .env file with real credentials"
echo "4. Deploy to a public URL (ngrok, Railway, etc.)"
echo "5. Configure webhook in Facebook Developer Portal"
