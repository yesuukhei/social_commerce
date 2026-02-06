const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['customer', 'bot', 'admin'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
});

const conversationSchema = new mongoose.Schema(
  {
    // Customer reference
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    // Facebook conversation ID
    facebookConversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Messages in this conversation
    messages: [messageSchema],
    // Conversation status
    status: {
      type: String,
      enum: ['active', 'waiting_for_info', 'order_created', 'closed'],
      default: 'active',
    },
    // Current intent detection
    currentIntent: {
      type: String,
      enum: ['browsing', 'ordering', 'inquiry', 'complaint', 'other'],
      default: 'browsing',
    },
    // Related orders
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    // Last activity
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // AI context for better conversation flow
    aiContext: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Update last activity on message add
conversationSchema.methods.addMessage = function (sender, text, metadata = {}) {
  this.messages.push({ sender, text, metadata });
  this.lastActivity = new Date();
  return this.save();
};

// Index for active conversations
conversationSchema.index({ status: 1, lastActivity: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
