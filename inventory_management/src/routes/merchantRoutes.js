const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  listMerchants,
  getMerchant,
  getMyProfile,
  updateMyProfile,
} = require("../controllers/merchantController");

const router = express.Router();

router.get("/", listMerchants);
router.get("/profile/me", authMiddleware, requireRole("merchant"), getMyProfile);
router.put("/profile/me", authMiddleware, requireRole("merchant"), updateMyProfile);
router.get("/:id", getMerchant);

module.exports = router;
