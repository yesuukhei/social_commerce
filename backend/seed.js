require("dotenv").config();
const mongoose = require("mongoose");
const { Store, Product } = require("./models");

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔗 Connected to MongoDB for seeding...");

    // 1. Create/Update Store
    const store = await Store.findOneAndUpdate(
      { facebookPageId: process.env.FACEBOOK_PAGE_ID },
      {
        name: "Миний Дэлгүүр (Test)",
        facebookPageToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        googleSheetId: process.env.GOOGLE_SHEET_ID,
        shopType: "clothing",
        customInstructions:
          "Чи бол загварын чиг хандлага мэддэг, найрсаг туслах бот юм.",
      },
      { upsert: true, new: true },
    );
    console.log(`✅ Store configured: ${store.name}`);

    // 2. Clear old products for this store
    await Product.deleteMany({ store: store._id });

    // 3. Add products
    const products = [
      {
        store: store._id,
        name: "Хар цамц",
        price: 45000,
        stock: 10,
        category: "Clothes",
      },
      {
        store: store._id,
        name: "Жинсэн өмд",
        price: 65000,
        stock: 5,
        category: "Clothes",
      },
      {
        store: store._id,
        name: "Хүүхдийн оймс",
        price: 5000,
        stock: 50,
        category: "Accessories",
      },
    ];

    await Product.insertMany(products);
    console.log("✅ 3 products added to the catalog!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedData();
