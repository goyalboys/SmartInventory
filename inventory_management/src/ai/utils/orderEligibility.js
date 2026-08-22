/**
 * Deterministic business rules derived from knowledge/cancellation-policy.md
 * and related docs.
 *
 * WHY BACKEND RULES + RAG?
 * - RAG explains policy in natural language ("what does our policy say?")
 * - Backend rules give structured truth ("is THIS order eligible right now?")
 * - The LLM combines both for hybrid answers — it should not guess eligibility.
 */

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);
const RETURNABLE_AFTER_DELIVERY_DAYS = 7;

const buildCancellationEligibility = (order) => {
  const { status, paymentMethod, paymentStatus } = order;

  if (status === "cancelled") {
    return {
      eligible: false,
      reason: "Order is already cancelled",
    };
  }

  if (status === "shipped") {
    return {
      eligible: false,
      reason: "Order has shipped — request a return after delivery instead",
      alternativeAction: "return_after_delivery",
    };
  }

  if (status === "delivered") {
    return {
      eligible: false,
      reason: "Order was delivered — use return/refund policy instead",
      alternativeAction: "return_or_refund",
    };
  }

  if (CANCELLABLE_STATUSES.has(status)) {
    const prepaidNote =
      paymentMethod === "razorpay" && paymentStatus === "paid"
        ? "Prepaid order — full refund will be issued if cancelled before shipping"
        : paymentMethod === "cod"
          ? "COD order — no payment collected yet"
          : null;

    return {
      eligible: true,
      reason: `Order status is '${status}' — cancellation is allowed per policy`,
      prepaidRefundNote: prepaidNote,
    };
  }

  return {
    eligible: false,
    reason: `Cancellation not available for status '${status}'`,
  };
};

const buildReturnEligibility = (order) => {
  if (order.status !== "delivered") {
    return {
      eligible: false,
      reason: "Returns apply only after delivery",
    };
  }

  const deliveredAt = order.updatedAt || order.createdAt;
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDelivery > RETURNABLE_AFTER_DELIVERY_DAYS) {
    return {
      eligible: false,
      reason: `Return window (${RETURNABLE_AFTER_DELIVERY_DAYS} days) has passed`,
      daysSinceDelivery,
    };
  }

  return {
    eligible: true,
    reason: `Within ${RETURNABLE_AFTER_DELIVERY_DAYS}-day return window`,
    daysSinceDelivery,
  };
};

const buildDamagedProductEligibility = (order) => {
  if (order.status !== "delivered") {
    return {
      eligible: false,
      reason: "Damaged-product claims apply after delivery",
      reportWithinHours: 48,
    };
  }

  return {
    eligible: true,
    reason: "Report damaged delivery with photos within 48 hours of delivery",
    reportWithinHours: 48,
    resolutionOptions: ["full_refund", "replacement", "partial_refund"],
  };
};

/**
 * Attach structured eligibility to an order object for hybrid agent responses.
 */
const getOrderEligibility = (order) => ({
  cancellation: buildCancellationEligibility(order),
  return: buildReturnEligibility(order),
  damagedProductClaim: buildDamagedProductEligibility(order),
});

module.exports = {
  getOrderEligibility,
  CANCELLABLE_STATUSES,
  RETURNABLE_AFTER_DELIVERY_DAYS,
};
