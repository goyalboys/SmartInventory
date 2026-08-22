const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    category: {
      type: String,
      enum: ["damaged_product", "refund", "return", "cancellation", "general"],
      default: "general",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ customer: 1, createdAt: -1 });
supportTicketSchema.index({ order: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
