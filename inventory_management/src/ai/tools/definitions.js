/**
 * Tool definitions sent to the LLM.
 *
 * These are NOT executable code — they are schemas that describe:
 * - what the tool does (description helps the model decide when to call it)
 * - what arguments it accepts (parameters)
 *
 * The LLM reads these and returns structured JSON like:
 *   { name: "getOrder", args: { orderId: "a1b2c3" } }
 */
const toolDefinitions = [
  {
    name: "getCustomerProfile",
    description:
      "Get the authenticated user's profile (name, email, role). Use when the user asks about their account.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getCustomerOrders",
    description:
      "List recent orders for the current user. Customers see orders they placed; merchants see incoming orders. Use for 'show my orders', 'recent orders', 'latest order'.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of orders to return (default 5, max 20)",
        },
      },
    },
  },
  {
    name: "getOrder",
    description:
      "Get full details of a specific order by order id. Accepts MongoDB id or short display id (last 6 characters shown in the app, e.g. A1B2C3).",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "Order identifier — full id or short 6-character display id",
        },
      },
      required: ["orderId"],
    },
  },
  {
    name: "getOrderStatus",
    description:
      "Get only the status of a specific order. Prefer this when the user only asks about order status/tracking.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "Order identifier — full id or short 6-character display id",
        },
      },
      required: ["orderId"],
    },
  },
  {
    name: "searchProducts",
    description:
      "Search the product catalog by name or description. Use when the user asks to find/browse products.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search text, e.g. 'iPhone' or 'laptop'",
        },
        limit: {
          type: "number",
          description: "Maximum results (default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getProductStock",
    description:
      "Check stock quantity for a product. Merchants can check their own inventory; customers see public availability.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product MongoDB id" },
        productName: { type: "string", description: "Exact or partial product name" },
      },
    },
  },
  {
    name: "searchKnowledgeBase",
    description:
      "Search company policies, FAQs, and support documentation. Use for refunds, returns, cancellations, shipping, damaged products, warranty, payment, replacements. ALSO use alongside order tools in hybrid questions like 'Can I cancel my order?' or 'Can I return this order?' — combine with getOrder/getCustomerOrders.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Natural language search query, e.g. 'order cancellation policy' or 'refund for damaged product'",
        },
        topK: {
          type: "number",
          description: "Number of document chunks to retrieve (default 3)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "createSupportTicket",
    description:
      "Create a support ticket to escalate an issue. Use AFTER explaining policy (often via hybrid RAG flow) when the user wants to proceed — e.g. damaged product report, refund request, return request.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Short ticket title" },
        description: { type: "string", description: "Detailed issue description" },
        category: {
          type: "string",
          description: "damaged_product | refund | return | cancellation | general",
        },
        orderId: {
          type: "string",
          description: "Related order id (full or 6-char display id) if applicable",
        },
        priority: {
          type: "string",
          description: "low | medium | high (default medium)",
        },
      },
      required: ["subject", "description"],
    },
  },
  {
    name: "getSupportTicket",
    description: "Get status of a support ticket by ticket id.",
    parameters: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket id (full or 6-char display id)" },
      },
      required: ["ticketId"],
    },
  },
  {
    name: "cancelOrder",
    description:
      "Cancel a specific order. Use ONLY when the user explicitly asks to cancel (not for eligibility questions). Requires human confirmation — the tool will NOT cancel immediately; user must confirm first. Check eligibility with getOrder first if unsure.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "Order to cancel — full id or 6-char display id",
        },
      },
      required: ["orderId"],
    },
  },
];

module.exports = { toolDefinitions };
