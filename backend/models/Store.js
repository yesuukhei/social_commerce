const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Facebook Integration
    facebookPageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    facebookPageToken: {
      type: String,
      required: true,
    },
    // Google Sheets Integration
    googleSheetId: {
      type: String,
    },
    // Shop Specifics
    shopType: {
      type: String,
      enum: ["clothing", "flower", "electronics", "food", "other"],
      default: "other",
    },
    // The "Soul" of the AI
    customInstructions: {
      type: String,
      default: "Чи бол найрсаг туслах бот юм.",
    },
    // Currency & Locale
    settings: {
      currency: { type: String, default: "MNT" },
      timezone: { type: String, default: "Asia/Ulaanbaatar" },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Store = mongoose.model("Store", storeSchema);
module.exports = Store;
