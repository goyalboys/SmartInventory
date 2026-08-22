/**
 * Infer how the agent resolved a request — useful for debug/demo views.
 */
const ORDER_TOOLS = new Set([
  "getOrder",
  "getOrderStatus",
  "getCustomerOrders",
]);

const ACTION_TOOLS = new Set([
  "createSupportTicket",
  "cancelOrder",
  "createOrder",
  "updateInventory",
]);

const inferFlowType = (trace) => {
  const toolNames = trace.toolCalls.map((call) => call.name);
  const hasRag =
    toolNames.includes("searchKnowledgeBase") ||
    (trace.ragRetrievals?.length ?? 0) > 0 ||
    Boolean(trace.ragRetrieval);

  const hasOrderTools = toolNames.some((name) => ORDER_TOOLS.has(name));
  const hasActionTools = toolNames.some((name) => ACTION_TOOLS.has(name));

  if (hasRag && hasOrderTools) return "hybrid_rag_and_order_data";
  if (hasRag && hasActionTools) return "hybrid_rag_and_action";
  if (hasRag && toolNames.length > 1) return "hybrid_rag_and_tools";
  if (hasRag) return "rag_only";
  if (toolNames.length > 0) return "tools_only";
  return "direct_response";
};

const buildHybridSummary = (trace) => {
  const flowType = inferFlowType(trace);

  if (!flowType.startsWith("hybrid")) {
    return null;
  }

  const orderTools = trace.toolCalls.filter((call) => ORDER_TOOLS.has(call.name));
  const ragCalls = trace.toolCalls.filter((call) => call.name === "searchKnowledgeBase");
  const actionTools = trace.toolCalls.filter((call) => ACTION_TOOLS.has(call.name));

  return {
    flowType,
    steps: [
      orderTools.length
        ? { type: "order_data", tools: orderTools.map((t) => t.name) }
        : null,
      ragCalls.length || trace.ragRetrieval
        ? {
            type: "policy_retrieval",
            queries: ragCalls.map((t) => t.args?.query).filter(Boolean),
            sources: trace.ragRetrieval?.sources || [],
          }
        : null,
      actionTools.length
        ? { type: "action", tools: actionTools.map((t) => t.name) }
        : null,
    ].filter(Boolean),
  };
};

module.exports = { inferFlowType, buildHybridSummary, ORDER_TOOLS, ACTION_TOOLS };
