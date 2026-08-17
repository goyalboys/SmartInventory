const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/paymentController");

const router = express.Router();

//router.get("/key", authMiddleware, requireRole("customer"), getRazorpayKey);
router.post("/create-order", authMiddleware, requireRole("customer"), createRazorpayOrder);
router.post("/verify", authMiddleware, requireRole("customer"), verifyRazorpayPayment);

module.exports = router;
