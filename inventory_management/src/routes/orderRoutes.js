const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  placeOrder,
  getMyOrders,
  getIncomingOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/", authMiddleware, requireRole("customer"), placeOrder);
router.get("/my", authMiddleware, requireRole("customer"), getMyOrders);
router.get("/incoming", authMiddleware, requireRole("merchant"), getIncomingOrders);
router.patch("/:id/status", authMiddleware, requireRole("merchant"), updateOrderStatus);

module.exports = router;
