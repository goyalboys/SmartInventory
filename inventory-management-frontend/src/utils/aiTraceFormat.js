/**
 * Format API trace objects into user-facing action steps for the chat UI.
 */

const formatToolArgs = (args) => {
  if (!args || typeof args !== "object") return "";
  const parts = Object.entries(args)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${value}`);
  return parts.join(", ");
};

export const buildActionSteps = (trace) => {
  if (!trace) return [];

  const steps = [];

  if (trace.flowType && trace.flowType !== "direct_response") {
    steps.push({
      type: "flow",
      icon: "🤖",
      label: "Agent flow",
      detail: trace.flowType.replace(/_/g, " "),
      status: "info",
    });
  }

  for (const call of trace.toolCalls || []) {
    if (call.name === "searchKnowledgeBase") continue;

    const isConfirmation = call.status === "confirmation_required";
    steps.push({
      type: "tool",
      icon: "🔧",
      label: call.name,
      detail: formatToolArgs(call.args),
      status: isConfirmation ? "pending" : call.success ? "success" : "error",
    });
  }

  const ragSources =
    trace.ragRetrieval?.sources ||
    (trace.ragRetrievals || []).flatMap((entry) => entry.sources || []);

  if (ragSources.length) {
    steps.push({
      type: "rag",
      icon: "📚",
      label: "Searching knowledge base",
      detail: [...new Set(ragSources.map((s) => s.sourceFile))].join(", "),
      status: "success",
    });
  }

  if (trace.confirmationRequired) {
    steps.push({
      type: "confirm",
      icon: "⚠️",
      label: "Confirmation required",
      detail: trace.confirmationRequired.summary,
      status: "pending",
    });
  }

  if (trace.toolCalls?.some((call) => call.executedAfterConfirmation)) {
    steps.push({
      type: "confirm",
      icon: "✅",
      label: "Confirmed action executed",
      detail: trace.toolCalls.find((call) => call.executedAfterConfirmation)?.name,
      status: "success",
    });
  }

  if (trace.latencyMs) {
    steps.push({
      type: "meta",
      icon: "⏱",
      label: "Response time",
      detail: `${trace.latencyMs}ms`,
      status: "info",
    });
  }

  return steps;
};

export const hasVisibleActions = (trace) => buildActionSteps(trace).length > 0;
