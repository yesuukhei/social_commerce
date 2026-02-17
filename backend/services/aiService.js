const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Unified AI service to process text messages
 * Detects intent, extracts order info, and generates response context in one call
 * @param {string} messageText - Customer's message
 * @param {Array} history - Brief conversation history for context
 * @param {Array} catalog - Available products for this store
 * @returns {object} Extracted data and response logic
 */
exports.processMessage = async (messageText, history = [], catalog = []) => {
  try {
    const formattedHistory = history
      .map((h) => `${h.sender === "customer" ? "User" : "Bot"}: ${h.text}`)
      .join("\n");

    const catalogContext =
      catalog.length > 0
        ? `ДЭЛГҮҮРИЙН БАРААНЫ ЖАГСААЛТ:\n${catalog.map((p) => `- ${p.name}: ₮${p.price} (Үлдэгдэл: ${p.stock})`).join("\n")}`
        : "АНХААР: Одоогоор дэлгүүрт бэлэн бараа байхгүй байна. Хэрэглэгчид удахгүй шинэ бараа ирнэ гэж эелдэгээр хэлээрэй.";

    const systemPrompt = `Чи бол Монголын онлайн дэлгүүрийн ухаалаг туслах бот.
ҮҮРЭГ: Хэрэглэгчийн мессежнээс зорилго болон захиалгын мэдээллийг задлан шинжлэх.

${catalogContext}

ЗОРИЛГО ТОДОРХОЙЛОХ (Intent):
1. 'browsing' -> Хэрэглэгч "сайн уу", "юу байна", "юу зардаг вэ", "санал болго" гэх мэтээр зөвхөн сонирхож байвал.
2. 'inquiry' -> Тодорхой бараа асуусан боловч (байгаа юу, үнэ хэд вэ) авах эсэх нь тодорхойгүй байвал.
3. 'ordering' -> "Авъя", "Захиалъя", "Нэгийг бичээрэй" гэх мэтээр худалдан авах шийдвэр гаргасан эсвэл хаяг, утсаа бичсэн бол.

ДҮРЭМ:
1. Латин галигаар бичсэн бол кирилл рүү хөрвүүлж ойлго.
2. Хэрэглэгчийн хүссэн бараа жагсаалтад байхгүй бол манайд байгаа өөр ижил төстэй барааг 'data.alternative_items' дотор санал болгож бич.
3. Дүүрэг, Хороог бүтэн нэршил рүү хөрвүүл.

ШИЙДВЭР ГАРГАЛТ (isOrderReady):
- Зөвхөн 'intent' : 'ordering' үед (Бараа + Утас + Хаяг) бүрэн байвал 'isOrderReady' : true болно.
- Бусад тохиолдолд (browsing, inquiry) үргэлж 'isOrderReady' : false байна.

JSON БҮТЭЦ:
{
  "intent": "browsing | inquiry | ordering",
  "isOrderReady": true/false,
  "confidence": number,
  "data": {
    "items": [{ "name": string, "quantity": number, "price": number, "attributes": object }],
    "alternative_items": [string], (Манай каталог-д байгаа бараануудаас)
    "phone": string,
    "full_address": string,
    "payment_method": string
  },
  "missingFields": ["phone", "full_address", "items"]
}`;

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
 * @param {object} order - Optional created order object for confirmation
 * @returns {string} Generated response
 */
exports.generateResponse = async (aiResult, userMessage, order = null) => {
  try {
    const orderContext = order
      ? `ЗАХИАЛГА БАТАЛГААЖЛАА:
         Дүн: ₮${order.totalAmount}
         Бараанууд: ${order.items.map((i) => `${i.itemName} x ${i.quantity}`).join(", ")}
         Утас: ${order.phoneNumber}
         Хаяг: ${order.address}`
      : "";

    const systemPrompt = `Чи бол Монголын онлайн дэлгүүрийн найрсаг туслах бот.
AI-ийн задалсан үр дүнд (AI Result) тулгуурлан хэрэглэгчид товч бөгөөд найрсаг хариулт өг.

${orderContext}

АНХААРАХ ДҮРЭМ:
1. Хэрэв ЗАХИАЛГА БАТАЛГААЖЛАА гэсэн контекст байвал: Баярлалаа гээд дээрх мэдээллийг жагсааж баталгаажуул. Нийт дүнг заавал хэл.
2. Хэрэв 'intent' : 'browsing' бол: Юу ч битгий нэхээрэй. Зөвхөн мэндлээд, манайд ямар бараанууд байгааг танилцуул.
3. Хэрэв хэрэглэгч "санал болго" гэвэл: "ДЭЛГҮҮРИЙН БАРААНЫ ЖАГСААЛТ"-аас 2-3 барааг онцлон санал болгож, үнийг нь хэл.
...`;

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
