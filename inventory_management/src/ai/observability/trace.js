const { inferFlowType, buildHybridSummary } = require("./flowType");

const createTrace = ({ conversationId, userId, userMessage, model }) => ({
  conversationId,
  userId,
  userMessage,
  model,
  startedAt: Date.now(),
  toolCalls: [],
  ragRetrieval: null,
  ragRetrievals: [],
  flowType: null,
  hybridSummary: null,
  confirmationRequired: null,
  success: true,
  error: null,
});

const recordToolCall = (trace, entry) => {
  trace.toolCalls.push(entry);
};

const finalizeTrace = (trace, { finalResponse, error }) => {
  trace.latencyMs = Date.now() - trace.startedAt;
  trace.finalResponse = finalResponse;
  trace.flowType = inferFlowType(trace);
  trace.hybridSummary = buildHybridSummary(trace);

  if (error) {
    trace.success = false;
    trace.error = error;
  }

  return trace;
};

module.exports = { createTrace, recordToolCall, finalizeTrace };
