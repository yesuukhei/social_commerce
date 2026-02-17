require("dotenv").config();
const aiService = require("../services/aiService");

const testCases = [
  {
    name: "Standard Order (Cyrillic)",
    message:
      "2 ширхэг хар цамц авъя. Утас: 99112233. БЗД 14-р хороо, 25-р байр",
    history: [],
  },
  {
    name: "Transliterated (Latin)",
    message: "2 shirheg har tsamts avya. Utas 88001122. BZD 14 khoroo",
    history: [],
  },
  {
    name: "Multiple Different Items",
    message: "1 улаан даашинз, 2 хар өмд авъя. 99001122, СХД 18-р хороо",
    history: [],
  },
  {
    name: "Missing Info (Inquiry)",
    message: "Энэ цамц хэд вэ?",
    history: [],
  },
  {
    name: "Context Handling (Requires History)",
    message: "За 2-ыг авъя. 95112233, ХУД 2-р хороо",
    history: [
      { sender: "customer", text: "Цэнхэр цамц байгаа юу?" },
      { sender: "bot", text: "Тийм ээ, байгаа. Үнэ нь 45,000 төгрөг." },
    ],
  },
  {
    name: "Abbreviations & Slang",
    message:
      "сайн уу, бзд 13-р хороолол хүргэлт байгаа юу? 99119911. 1 куртка авъя",
    history: [],
  },
  {
    name: "Mixed Numbers (Phone vs Qty)",
    message:
      "99110022 руу залгаарай, 5 ширхэг хүүхдийн оймс авъя. БЗД 2-р хороо",
    history: [],
  },
  {
    name: "Foreign Language Mix",
    message: "I want to buy 2 black T-shirts. Delivery to BZD. Phone 88997766",
    history: [],
  },
];

async function runTests() {
  console.log("🧪 Starting AI Smart Assistant Tests...\n");
  console.log("--------------------------------------------------\n");

  let passed = 0;

  for (const test of testCases) {
    console.log(`📝 Testing: ${test.name}`);
    console.log(`💬 Message: "${test.message}"`);

    try {
      const start = Date.now();
      const result = await aiService.processMessage(test.message, test.history);
      const duration = Date.now() - start;

      console.log(`⏱️ Duration: ${duration}ms`);
      console.log(`🔍 Full Result: ${JSON.stringify(result, null, 2)}`);

      if (result.intent === "ordering" && result.isOrderReady) {
        passed++;
      }

      console.log("\n--------------------------------------------------\n");
    } catch (error) {
      console.error(`❌ Test Failed: ${test.name}`, error.message);
    }
  }

  console.log(
    `🏁 Tests Completed. ${passed}/${testCases.length} orders extracted successfully.`,
  );
}

runTests();
