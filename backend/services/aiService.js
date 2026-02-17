const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Unified AI service to process text messages
 * Detects intent, extracts order info, and generates response context in one call
 * @param {string} messageText - Customer's message
 * @param {Array} history - Brief conversation history for context
 * @returns {object} Extracted data and response logic
 */
exports.processMessage = async (messageText, history = []) => {
  try {
    const formattedHistory = history
      .map((h) => `${h.sender === "customer" ? "User" : "Bot"}: ${h.text}`)
      .join("\n");

    const systemPrompt = `Чи бол Монголын онлайн дэлгүүрийн ухаалаг туслах бот.
ҮҮРЭГ: Хэрэглэгчийн мессежнээс зорилго (intent) болон захиалгын мэдээллийг задлан шинжлэх.

ДҮРЭМ:
1. Латин галигаар бичсэн бол (жишээ нь: "tsamts avya") кирилл рүү хөрвүүлж ойлго.
2. Товчлолыг (БЗД, ХУД, СХД, 1-р хороо) бүтэн нэршил рүү хөрвүүл (Баянзүрх дүүрэг гэх мэт).
3. Хэрэв хэрэглэгч олон төрлийн бараа бичсэн бол 'items' хүснэгтэд салгаж бич.
4. 'confidence' оноог 0.0-1.0 хооронд өг.

JSON БҮТЭЦ:
{
  "intent": "ordering | inquiry | complaint | browsing",
  "isOrderReady": true/false,
  "confidence": number,
  "data": {
    "items": [{ "name": string, "quantity": number, "size": string, "color": string }],
    "phone": string,
    "address": {
       "district": string,
       "khoroo": string,
       "detail": string
    },
    "full_address": string,
    "payment_method": "qpay | cash | transfer | null"
  },
  "missingFields": ["phone", "address", "items"]
}

Хэрэв өмнөх ярианы контекст (History) байгаа бол түүнийг ашиглан "тэрийг авъя", "тийн" гэх мэт үгсийг юуг зааж байгааг тодорхойл.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Өмнөх яриа:\n${formattedHistory}\n\nШинэ мессеж: ${messageText}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    console.log("🤖 AI Processed:", {
      intent: result.intent,
      isOrder: result.isOrderReady,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    console.error("❌ Error in AI processing:", error);
    return {
      intent: "other",
      isOrderReady: false,
      confidence: 0,
      data: { items: [], phone: null, full_address: null },
      missingFields: ["items"],
    };
  }
};

/**
 * Generate a friendly response in Mongolian
 * @param {object} aiResult - Result from processMessage
 * @param {string} userMessage - User's original message
 * @returns {string} Generated response
 */
exports.generateResponse = async (aiResult, userMessage) => {
  try {
    const systemPrompt = `Чи бол Монголын онлайн дэлгүүрийн найрсаг туслах бот.
AI-ийн задалсан үр дүнд тулгуурлан хэрэглэгчид товч бөгөөд найрсаг хариулт өг.

Хэрэв:
1. Захиалга бэлэн бол: Баярлалаа гээд мэдээллийг нь баталгаажуулж харуул. 
2. Мэдээлэл дутуу бол: Яг аль нь дутуу байгааг эелдэгээр асуу.
3. Зүгээр асуулт бол: Найрсаг хариулт өг.

Монгол хэлээр, emoji ашиглан хариул.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `AI Result: ${JSON.stringify(aiResult)}\nUser Message: ${userMessage}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error generating response:", error);
    return "Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.";
  }
};

/**
 * Validate phone number format (Mongolian)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
exports.validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  const cleaned = phoneNumber.replace(/\D/g, "");
  return cleaned.length === 8 && /^[6-9]\d{7}$/.test(cleaned);
};

/**
 * Normalize phone number to standard format
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string} Normalized phone number
 */
exports.normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (cleaned.length === 8) return cleaned;
  return null;
};
