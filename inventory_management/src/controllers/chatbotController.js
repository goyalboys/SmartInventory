const User = require("../models/User");
const { runAgent } = require("../ai/agent/agent");
const {
  getActivePendingAction,
  resolveUserConfirmation,
  markPendingAction,
} = require("../ai/memory/pendingActions");
const {
  getOrCreateConversation,
  createConversation,
  loadHistoryForAgent,
  appendExchange,
  getConversationForUser,
  listConversations,
  formatConversation,
  formatConversationSummary,
} = require("../ai/memory/conversation");
const { executeConfirmedPendingAction } = require("../ai/tools/registry");

const buildAssistantMetadata = (trace, extra = {}) => {
  if (!trace) return extra;

  return {
    flowType: trace.flowType,
    model: trace.model,
    latencyMs: trace.latencyMs,
    success: trace.success,
    toolCalls: trace.toolCalls,
    ragRetrieval: trace.ragRetrieval,
    ragRetrievals: trace.ragRetrievals,
    hybridSummary: trace.hybridSummary,
    confirmationRequired: trace.confirmationRequired || null,
    trace: {
      conversationId: trace.conversationId,
      model: trace.model,
      latencyMs: trace.latencyMs,
      toolCalls: trace.toolCalls,
      ragRetrieval: trace.ragRetrieval,
      ragRetrievals: trace.ragRetrievals,
      flowType: trace.flowType,
      hybridSummary: trace.hybridSummary,
      confirmationRequired: trace.confirmationRequired || null,
      success: trace.success,
    },
    ...extra,
  };
};

const buildTracePayload = (trace, overrides = {}) => ({
  conversationId: trace?.conversationId,
  model: trace?.model,
  latencyMs: trace?.latencyMs,
  toolCalls: trace?.toolCalls || [],
  ragRetrieval: trace?.ragRetrieval || null,
  ragRetrievals: trace?.ragRetrievals || [],
  flowType: trace?.flowType || overrides.flowType,
  hybridSummary: trace?.hybridSummary || null,
  confirmationRequired: trace?.confirmationRequired || overrides.confirmationRequired || null,
  success: trace?.success !== false,
  ...overrides,
});

const sendMessage = async (req, res) => {
  try {
    const { message, confirmActionId, rejectActionId, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const user = await User.findById(req.userId).select("name email role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const conversation = await getOrCreateConversation(user._id, conversationId);
    const resolvedConversationId = conversation._id.toString();

    const context = {
      userId: user._id.toString(),
      userName: user.name,
      role: user.role,
      conversationId: resolvedConversationId,
    };

    console.log(resolvedConversationId);
    const pendingAction = await getActivePendingAction(resolvedConversationId, user._id);

    console.log(pendingAction);

    const confirmationDecision = resolveUserConfirmation({
      message: message.trim(),
      confirmActionId,
      rejectActionId,
      pendingAction,
    });
    

    if (confirmationDecision === "reject" && pendingAction) {
      await markPendingAction(pendingAction._id, "rejected");

      const reply = "Understood — I won't proceed with that action.";

      await appendExchange(resolvedConversationId, user._id, {
        userMessage: message.trim(),
        assistantMessage: reply,
        assistantMetadata: buildAssistantMetadata(null, { flowType: "confirmation_rejected" }),
      });

      return res.json({
        reply,
        conversationId: resolvedConversationId,
        confirmationResolved: {
          status: "rejected",
          actionId: pendingAction._id.toString(),
        },
        trace: buildTracePayload(null, { flowType: "confirmation_rejected", conversationId: resolvedConversationId }),
      });
    }

    if (confirmationDecision === "confirm" && pendingAction) {
      const executionResult = await executeConfirmedPendingAction(pendingAction, context);
      await markPendingAction(pendingAction._id, "executed", executionResult);

      const reply = executionResult.success
        ? executionResult.data?.message ||
          `Done. ${pendingAction.summary} has been completed.`
        : `I couldn't complete that action: ${executionResult.error}`;

      const confirmTrace = buildTracePayload(null, {
        conversationId: resolvedConversationId,
        flowType: "confirmation_executed",
        toolCalls: [
          {
            name: pendingAction.toolName,
            args: pendingAction.toolArgs,
            success: executionResult.success,
            executedAfterConfirmation: true,
            result: executionResult.success ? executionResult.data : { error: executionResult.error },
          },
        ],
      });

      await appendExchange(resolvedConversationId, user._id, {
        userMessage: message.trim(),
        assistantMessage: reply,
        assistantMetadata: buildAssistantMetadata(confirmTrace, {
          toolName: pendingAction.toolName,
        }),
      });

      return res.json({
        reply,
        conversationId: resolvedConversationId,
        confirmationResolved: {
          status: executionResult.success ? "executed" : "failed",
          actionId: pendingAction._id.toString(),
          toolName: pendingAction.toolName,
        },
        trace: confirmTrace,
      });
    }

    const conversationHistory = await loadHistoryForAgent(conversation);

    const { reply, trace } = await runAgent({
      message: message.trim(),
      context,
      conversationHistory,
    });

    const tracePayload = buildTracePayload(trace, {
      memoryMessageCount: conversation.messages.length + 2,
    });

    await appendExchange(resolvedConversationId, user._id, {
      userMessage: message.trim(),
      assistantMessage: reply,
      assistantMetadata: buildAssistantMetadata(trace),
    });

    res.json({
      reply,
      conversationId: resolvedConversationId,
      confirmationRequired: trace.confirmationRequired || null,
      trace: tracePayload,
    });
  } catch (error) {
    console.error("Chatbot error:", error);

    if (error.message?.includes("GEMINI_API_KEY")) {
      return res.status(503).json({
        message: "AI service is not configured. Set GEMINI_API_KEY in .env",
      });
    }

    res.status(500).json({ message: "Failed to process message" });
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.id, req.userId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    res.json({ conversation: formatConversation(conversation) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load conversation" });
  }
};

const startConversation = async (req, res) => {
  try {
    const conversation = await createConversation(req.userId);
    res.status(201).json({ conversation: formatConversationSummary(conversation) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create conversation" });
  }
};

const getConversationList = async (req, res) => {
  try {
    const conversations = await listConversations(req.userId);
    res.json({
      conversations: conversations.map(formatConversationSummary),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to list conversations" });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  startConversation,
  getConversationList,
};
