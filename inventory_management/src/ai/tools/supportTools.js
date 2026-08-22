const SupportTicket = require("../../models/SupportTicket");
const Order = require("../../models/Order");

const resolveOrder = async (orderId) => {
  if (!orderId?.trim()) return { order: null };

  const trimmed = orderId.trim();

  if (/^[a-f\d]{24}$/i.test(trimmed)) {
    const order = await Order.findById(trimmed);
    return { order };
  }

  const suffix = trimmed.replace(/^ord[-#]?/i, "").slice(-6).toLowerCase();
  const matches = await Order.aggregate([
    {
      $addFields: {
        displayId: { $toLower: { $substr: [{ $toString: "$_id" }, 18, 6] } },
      },
    },
    { $match: { displayId: suffix } },
    { $limit: 1 },
  ]);

  if (!matches.length) return { order: null };
  const order = await Order.findById(matches[0]._id);
  return { order };
};

const { retrieveRelevantChunks } = require("../rag/retrieval");

const recordRagRetrieval = (context, retrievalMeta) => {
  if (!context.trace) return;

  if (!context.trace.ragRetrievals) {
    context.trace.ragRetrievals = [];
  }

  context.trace.ragRetrievals.push(retrievalMeta);
  context.trace.ragRetrieval = retrievalMeta;
};

/**
 * searchKnowledgeBase — RAG retrieval tool.
 */
const searchKnowledgeBase = async ({ query, topK }, context) => {
  const startedAt = Date.now();

  const result = await retrieveRelevantChunks(query, {
    topK: topK ? Number(topK) : undefined,
  });

  const retrievalMeta = {
    query: result.query || query,
    topK: result.topK,
    minScore: result.minScore,
    durationMs: Date.now() - startedAt,
    sources: (result.chunks || []).map((chunk) => ({
      sourceFile: chunk.sourceFile,
      section: chunk.section,
      score: Number(chunk.score.toFixed(4)),
    })),
  };

  recordRagRetrieval(context, retrievalMeta);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      meta: { rag: retrievalMeta },
    };
  }

  if (!result.found) {
    return {
      success: true,
      data: {
        found: false,
        message:
          "No relevant policy information was found in the knowledge base for this query.",
        chunks: [],
      },
      meta: { rag: retrievalMeta },
    };
  }

  return {
    success: true,
    data: {
      found: true,
      query: result.query,
      chunks: result.chunks.map((chunk) => ({
        sourceFile: chunk.sourceFile,
        section: chunk.section,
        content: chunk.content,
        relevanceScore: Number(chunk.score.toFixed(4)),
      })),
    },
    meta: { rag: retrievalMeta },
  };
};

const formatTicket = (ticket) => ({
  id: ticket._id.toString(),
  displayId: ticket._id.toString().slice(-6).toUpperCase(),
  category: ticket.category,
  subject: ticket.subject,
  description: ticket.description,
  status: ticket.status,
  priority: ticket.priority,
  orderId: ticket.order?.toString() || null,
  createdAt: ticket.createdAt,
});

/**
 * createSupportTicket — escalate an issue after explaining policy (hybrid action flow).
 */
const createSupportTicket = async (
  { subject, description, category, orderId, priority },
  context
) => {
  if (!subject?.trim() || !description?.trim()) {
    return {
      success: false,
      error: "subject and description are required",
    };
  }

  const validCategories = ["damaged_product", "refund", "return", "cancellation", "general"];
  const ticketCategory = validCategories.includes(category) ? category : "general";

  let linkedOrder = null;

  if (orderId) {
    const { order } = await resolveOrder(orderId);

    if (!order) {
      return { success: false, error: `Order not found: ${orderId}` };
    }

    if (context.role === "customer" && order.customer.toString() !== context.userId) {
      return {
        success: false,
        error: "You are not authorized to create a ticket for this order",
      };
    }

    if (context.role === "merchant" && order.merchant.toString() !== context.userId) {
      return {
        success: false,
        error: "You are not authorized to create a ticket for this order",
      };
    }

    linkedOrder = order._id;
  }

  const ticket = await SupportTicket.create({
    customer: context.userId,
    order: linkedOrder,
    category: ticketCategory,
    subject: subject.trim(),
    description: description.trim(),
    priority: priority || "medium",
    status: "open",
  });

  return {
    success: true,
    data: {
      message: "Support ticket created successfully",
      ticket: formatTicket(ticket),
    },
  };
};

/**
 * getSupportTicket — look up a ticket by id (own tickets only for customers).
 */
const getSupportTicket = async ({ ticketId }, context) => {
  if (!ticketId?.trim()) {
    return { success: false, error: "ticketId is required" };
  }

  const trimmed = ticketId.trim();
  let ticket = null;

  if (/^[a-f\d]{24}$/i.test(trimmed)) {
    ticket = await SupportTicket.findById(trimmed);
  } else {
    const suffix = trimmed.replace(/^tkt[-#]?/i, "").slice(-6).toLowerCase();
    const tickets = await SupportTicket.find({});
    ticket = tickets.find((t) => t._id.toString().slice(-6).toLowerCase() === suffix);
  }

  if (!ticket) {
    return { success: false, error: `Support ticket not found: ${ticketId}` };
  }

  if (context.role === "customer" && ticket.customer.toString() !== context.userId) {
    return {
      success: false,
      error: "You are not authorized to view this ticket",
    };
  }

  return {
    success: true,
    data: formatTicket(ticket),
  };
};

module.exports = {
  searchKnowledgeBase,
  createSupportTicket,
  getSupportTicket,
};
