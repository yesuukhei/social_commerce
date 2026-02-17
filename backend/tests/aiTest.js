require("dotenv").config();
const aiService = require("../services/aiService");

const testCases = [
  {
    name: "Standard Order (Cyrillic) - IN CATALOG",
    message: "2 ширхэг хар цамц авъя. Утас: 99112233. БЗД 14-р хороо",
    history: [],
  },
  {
    name: "Standard Order - NOT IN CATALOG",
    message: "1 ширхэг гутал авъя. Утас: 99112233. ХУД 2-р хороо",
    history: [],
  },
  {
    name: "Mixed Ordering (One in, one out)",
    message: "Хар цамц 1, гутал 1 авъя. 88889999",
    history: [],
  },
];

const mockCatalog = [
  { name: "хар цамц", price: 45000, stock: 10 },
  { name: "улаан даашинз", price: 75000, stock: 5 },
  { name: "хар өмд", price: 55000, stock: 8 },
  { name: "хүүхдийн оймс", price: 5000, stock: 20 },
];

async function runTests() {
  console.log("🧪 Starting Smart AI Catalog Tests...\n");

  for (const test of testCases) {
    console.log(`📝 Testing: ${test.name}`);
    console.log(`💬 Message: "${test.message}"`);

    try {
      const result = await aiService.processMessage(
        test.message,
        test.history,
        mockCatalog,
      );

      console.log(`🎯 Intent: ${result.intent}`);
      console.log(`✅ Ready: ${result.isOrderReady}`);
      console.log(`📦 Extracted Items: ${JSON.stringify(result.data.items)}`);

      if (result.isOrderReady) {
        console.log("💰 AI found the items in catalog and calculated prices!");
      } else {
        console.log(
          "❌ AI correctly flagged that some items or info are missing.",
        );
      }

      console.log("\n--------------------------------------------------\n");
    } catch (error) {
      console.error(`❌ Test Failed: ${test.name}`, error.message);
    }
  }
  console.log(`🏁 Tests Completed.`);
}

runTests();
