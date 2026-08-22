const PendingAction = require("../../models/PendingAction");

const CONFIRMATION_TTL_MS = Number(process.env.CONFIRMATION_TTL_MS) || 30 * 60 * 1000;

const CONFIRM_PATTERNS = [
  /^yes\b/i,
  /^yeah\b/i,
  /^yep\b/i,
  /^sure\b/i,
  /^ok(ay)?\b/i,
  /^confirm\b/i,
  /^go ahead\b/i,
  /^proceed\b/i,
  /^do it\b/i,
  /^please do\b/i,
];

const REJECT_PATTERNS = [
  /^no\b/i,
  /^nope\b/i,
  /^cancel\b/i,
  /^don't\b/i,
  /^do not\b/i,
  /^stop\b/i,
  /^never mind\b/i,
  /^nevermind\b/i,
];

const isConfirmationMessage = (message) => {
  const text = message?.trim();
  if (!text) return false;
  return CONFIRM_PATTERNS.some((pattern) => pattern.test(text));
};

const isRejectionMessage = (message) => {
  const text = message?.trim();
  if (!text) return false;
  return REJECT_PATTERNS.some((pattern) => pattern.test(text));
};

const resolveUserConfirmation = ({ message, confirmActionId, rejectActionId, pendingAction }) => {
  if (confirmActionId && pendingAction && pendingAction._id.toString() === confirmActionId) {
    return "confirm";
  }

  if (rejectActionId && pendingAction && pendingAction._id.toString() === rejectActionId) {
    return "reject";
  }

  if (!pendingAction) return null;

  if (isConfirmationMessage(message)) return "confirm";
  if (isRejectionMessage(message)) return "reject";

  return null;
};

const getActivePendingAction = async (conversationId, userId) => {
  await PendingAction.updateMany(
    {
      conversationId,
      userId,
      status: "pending",
      expiresAt: { $lt: new Date() },
    },
    { status: "expired" }
  );

  return PendingAction.findOne({
    conversationId,
    userId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

const createPendingAction = async ({
  userId,
  conversationId,
  toolName,
  toolArgs,
  summary,
}) => {
  // One pending action per conversation — replace previous pending
  await PendingAction.updateMany(
    { userId, conversationId, status: "pending" },
    { status: "expired" }
  );

  return PendingAction.create({
    userId,
    conversationId,
    toolName,
    toolArgs,
    summary,
    status: "pending",
    expiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS),
  });
};

const markPendingAction = async (pendingActionId, status, executionResult = null) => {
  const update = { status };

  if (status === "executed") {
    update.executedAt = new Date();
    update.executionResult = executionResult;
  }

  return PendingAction.findByIdAndUpdate(pendingActionId, update, {
    returnDocument: "after",
  });
};

const formatPendingAction = (action) => ({
  id: action._id.toString(),
  toolName: action.toolName,
  toolArgs: action.toolArgs,
  summary: action.summary,
  expiresAt: action.expiresAt,
  status: action.status,
});

module.exports = {
  CONFIRMATION_TTL_MS,
  isConfirmationMessage,
  isRejectionMessage,
  resolveUserConfirmation,
  getActivePendingAction,
  createPendingAction,
  markPendingAction,
  formatPendingAction,
};
