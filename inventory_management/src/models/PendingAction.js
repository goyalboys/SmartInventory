const mongoose = require("mongoose");

/**
 * Stores destructive AI-requested actions awaiting user confirmation.
 * Human-in-the-loop: the LLM may REQUEST an action, but the backend
 * waits for explicit user approval before EXECUTING it.
 */
const pendingActionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    conversationId: {
      type: String,
      required: true,
      trim: true,
    },

    toolName: {
      type: String,
      required: true,
      trim: true,
    },

    toolArgs: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "expired", "executed"],
      default: "pending",
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    executedAt: {
      type: Date,
    },

    executionResult: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

pendingActionSchema.index({ userId: 1, conversationId: 1, status: 1 });
pendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingAction", pendingActionSchema);
