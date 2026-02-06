const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract order information from Mongolian text message
 * @param {string} messageText - Customer's message in Mongolian
 * @returns {object} Extracted order data with confidence score
 */
exports.extractOrderFromMessage = async (messageText) => {
  try {
    const systemPrompt = `Чи бол Монголын онлайн дэлгүүрийн туслах бот. Хэрэглэгчийн мессежнээс захиалгын мэдээллийг задлан шинжилж, JSON форматаар гаргаж өг.

Дараах мэдээллийг олж ав:
- item_name: Бараа/бүтээгдэхүүний нэр (Монгол хэлээр)
- quantity: Тоо ширхэг (тоогоор)
- phone_number: Утасны дугаар (8 оронтой)
- address: Хүргэх хаяг (дүүрэг, хороо, байр гэх мэт)

Монгол хэлний хар яриа, товчлол, алдаатай бичиглэлийг ойлгож ажилла.

Жишээ нь:
- "2 ширхэг цамц авмаар байна" → quantity: 2, item_name: "цамц"
- "99119911" эсвэл "9911-9911" → phone_number: "99119911"
- "БЗД, 1-р хороо" → address: "Баянзүрх дүүрэг, 1-р хороо"

Хэрэв мэдээлэл дутуу бол null гэж тэмдэглэ.

Хариултаа зөвхөн JSON форматаар өг:
{
  "isOrder": true/false,
  "confidence": 0.0-1.0,
  "data": {
    "item_name": "...",
    "quantity": number,
    "phone_number": "...",
    "address": "..."
  },
  "needsMoreInfo": true/false,
  "missingFields": ["field1", "field2"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: messageText,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    console.log('🤖 AI Extraction:', {
      input: messageText,
      output: result,
      tokens: completion.usage,
    });

    return result;
  } catch (error) {
    console.error('❌ Error in AI extraction:', error);

    // Return safe fallback
    return {
      isOrder: false,
      confidence: 0,
      data: {
        item_name: null,
        quantity: null,
        phone_number: null,
        address: null,
      },
      needsMoreInfo: true,
      missingFields: ['item_name', 'quantity', 'phone_number', 'address'],
      error: error.message,
    };
  }
};

/**
 * Analyze conversation intent
 * @param {string} messageText - Customer's message
 * @returns {string} Intent type: 'ordering', 'inquiry', 'complaint', 'browsing'
 */
exports.detectIntent = async (messageText) => {
  try {
    const systemPrompt = `Монгол хэлний мессежийг уншиж, хэрэглэгчийн зорилгыг тодорхойл.

Зорилгын төрлүүд:
- "ordering": Захиалга өгөх гэж байна
- "inquiry": Асуулт асууж байна (үнэ, хүргэлт гэх мэт)
- "complaint": Гомдол гаргаж байна
- "browsing": Зүгээр л харж байна

Хариултаа зөвхөн нэг үг буцаа: ordering, inquiry, complaint, эсвэл browsing`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: messageText,
        },
      ],
      temperature: 0.2,
      max_tokens: 10,
    });

    const intent = completion.choices[0].message.content.trim().toLowerCase();
    return intent;
  } catch (error) {
    console.error('❌ Error detecting intent:', error);
    return 'browsing';
  }
};

/**
 * Generate a friendly response in Mongolian
 * @param {string} context - Context of the conversation
 * @param {string} userMessage - User's message
 * @returns {string} Generated response
 */
exports.generateResponse = async (context, userMessage) => {
  try {
    const systemPrompt = `Чи бол Монголын онлайн дэлгүүрийн найрсаг туслах бот. Хэрэглэгчтэй эелдэг, ойлгомжтой харилцаж, захиалга өгөхөд нь туслаарай.

Дүрэм:
- Монгол хэлээр хариулах
- Товч бөгөөд тодорхой байх
- Emoji ашиглаж, найрсаг байх
- Захиалгын мэдээлэл дутуу бол асууж тодруулах`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Контекст: ${context}\n\nХэрэглэгчийн мессеж: ${userMessage}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error generating response:', error);
    return 'Уучлаарай, алдаа гарлаа. Дахин оролдоно уу.';
  }
};

/**
 * Validate phone number format (Mongolian)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
exports.validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;

  // Remove spaces, dashes, and other non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Mongolian phone numbers are 8 digits
  return cleaned.length === 8 && /^[6-9]\d{7}$/.test(cleaned);
};

/**
 * Normalize phone number to standard format
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string} Normalized phone number
 */
exports.normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Return 8-digit format
  if (cleaned.length === 8) {
    return cleaned;
  }

  return null;
};
