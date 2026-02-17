const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    min: 0,
  },
  subtotal: {
    type: Number,
    min: 0,
  },
  attributes: {
    type: Map,
    of: String,
    default: {},
  },
});

const orderSchema = new mongoose.Schema(
  {
    // Customer reference
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    // Order items
    items: [orderItemSchema],
    // Contact information
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    // Order status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    // Financial information
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // AI extraction data
    aiExtraction: {
      rawMessage: {
        type: String,
        required: true,
      },
      extractedData: {
        type: mongoose.Schema.Types.Mixed,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      needsReview: {
        type: Boolean,
        default: false,
      },
    },
    // Human verification
    verifiedBy: {
      type: String, // Store owner/admin ID
    },
    verifiedAt: {
      type: Date,
    },
    // Conversation reference
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    // Notes
    notes: {
      type: String,
    },
    // Delivery tracking
    deliveryTracking: {
      carrier: String,
      trackingNumber: String,
      estimatedDelivery: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "aiExtraction.needsReview": 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ phoneNumber: 1 }); // Keeping only one if it was duplicated

// Calculate total before saving
orderSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      const subtotal = (item.price || 0) * item.quantity;
      item.subtotal = subtotal;
      return total + subtotal;
    }, 0);
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
