const customerTools = require("./customerTools");
const orderTools = require("./orderTools");
const productTools = require("./productTools");
const supportTools = require("./supportTools");
const {
  createPendingAction,
  formatPendingAction,
} = require("../memory/pendingActions");

const toolHandlers = {
  getCustomerProfile: customerTools.getCustomerProfile,
  getCustomerOrders: customerTools.getCustomerOrders,
  getOrder: orderTools.getOrder,
  getOrderStatus: orderTools.getOrderStatus,
  cancelOrder: orderTools.cancelOrder,
  searchProducts: productTools.searchProducts,
  getProductStock: productTools.getProductStock,
  searchKnowledgeBase: supportTools.searchKnowledgeBase,
  createSupportTicket: supportTools.createSupportTicket,
  getSupportTicket: supportTools.getSupportTicket,
};

/**
 * Preview/validate before creating a pending confirmation.
 */
const toolPreviewHandlers = {
  cancelOrder: orderTools.previewCancelOrder,
};

const toolRolePermissions = {
  getCustomerProfile: ["customer", "merchant"],
  getCustomerOrders: ["customer", "merchant"],
  getOrder: ["customer", "merchant"],
  getOrderStatus: ["customer", "merchant"],
  cancelOrder: ["customer", "merchant"],
  searchProducts: ["customer", "merchant"],
  getProductStock: ["customer", "merchant"],
  searchKnowledgeBase: ["customer", "merchant"],
  createSupportTicket: ["customer", "merchant"],
  getSupportTicket: ["customer", "merchant"],
};

/**
 * Destructive or high-impact tools that require explicit user confirmation.
 */
const toolsRequiringConfirmation = new Set(["cancelOrder"]);

const buildConfirmationRequiredResult = (pendingAction, preview) => ({
  success: false,
  status: "confirmation_required",
  error: "This action requires explicit user confirmation before execution.",
  data: {
    pendingActionId: pendingAction._id.toString(),
    action: pendingAction.toolName,
    summary: pendingAction.summary,
    toolArgs: pendingAction.toolArgs,
    preview: preview?.details || null,
    expiresAt: pendingAction.expiresAt,
    message:
      "Ask the user to confirm before proceeding. Do NOT claim the action was completed.",
  },
});

const executeTool = async (toolName, args, context) => {
  const startedAt = Date.now();
  const requiresConfirmation = toolsRequiringConfirmation.has(toolName);

  const handler = toolHandlers[toolName];
  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
      meta: { toolName, durationMs: Date.now() - startedAt },
    };
  }

  const allowedRoles = toolRolePermissions[toolName];
  if (!allowedRoles?.includes(context.role)) {
    return {
      success: false,
      error: `Role '${context.role}' is not allowed to use ${toolName}`,
      meta: { toolName, durationMs: Date.now() - startedAt },
    };
  }

  try {
    /**
     * Human-in-the-loop gate:
     * If tool needs confirmation and this is NOT an approved execution,
     * validate + create pending action instead of mutating data.
     */
    if (requiresConfirmation && !context.executePendingAction) {
      const previewHandler = toolPreviewHandlers[toolName];
      const preview = previewHandler
        ? await previewHandler(args || {}, context)
        : { valid: true, summary: `Execute ${toolName}` };

      if (!preview.valid) {
        return {
          success: false,
          error: preview.error || "Action cannot be performed",
          meta: { toolName, args, durationMs: Date.now() - startedAt },
        };
      }

      const pendingAction = await createPendingAction({
        userId: context.userId,
        conversationId: context.conversationId,
        toolName,
        toolArgs: args || {},
        summary: preview.summary,
      });

      if (context.trace) {
        context.trace.confirmationRequired = formatPendingAction(pendingAction);
      }

      return {
        ...buildConfirmationRequiredResult(pendingAction, preview),
        meta: {
          toolName,
          args,
          durationMs: Date.now() - startedAt,
          requiresConfirmation: true,
          pendingActionId: pendingAction._id.toString(),
        },
      };
    }

    const result = await handler(args || {}, context);

    return {
      ...result,
      meta: {
        toolName,
        args,
        durationMs: Date.now() - startedAt,
        requiresConfirmation,
        executedAfterConfirmation: Boolean(context.executePendingAction),
      },
    };
  } catch (error) {
    console.error(`Tool ${toolName} failed:`, error);
    return {
      success: false,
      error: error.message || "Tool execution failed",
      meta: { toolName, args, durationMs: Date.now() - startedAt },
    };
  }
};

/**
 * Execute a previously confirmed pending action (bypasses confirmation gate).
 */
const executeConfirmedPendingAction = async (pendingAction, context) => {
  const toolContext = {
    ...context,
    executePendingAction: true,
  };

  return executeTool(pendingAction.toolName, pendingAction.toolArgs, toolContext);
};

module.exports = {
  toolHandlers,
  toolPreviewHandlers,
  toolRolePermissions,
  toolsRequiringConfirmation,
  executeTool,
  executeConfirmedPendingAction,
};
