const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
    },
    variants: [
      {
        name: String, // e.g., "Size", "Color"
        options: [String], // e.g., ["L", "XL"], ["Red", "Black"]
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    images: [String],
  },
  {
    timestamps: true,
  },
);

// Search index
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
