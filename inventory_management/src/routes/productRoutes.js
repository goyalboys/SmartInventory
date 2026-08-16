const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getPublicCategories,
  getMerchantCategories,
  getMyCategories,
  addCustomCategory,
  addCustomSubcategory,
} = require("../controllers/categoryController");
const {
  getMyProducts,
  getMerchantProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();

router.get("/categories", getPublicCategories);
router.get("/categories/my", authMiddleware, requireRole("merchant"), getMyCategories);
router.post("/categories/my", authMiddleware, requireRole("merchant"), addCustomCategory);
router.post("/categories/my/subcategory", authMiddleware, requireRole("merchant"), addCustomSubcategory);
router.get("/categories/merchant/:merchantId", getMerchantCategories);

router.get("/merchant/:merchantId", getMerchantProducts);

router.get("/my", authMiddleware, requireRole("merchant"), getMyProducts);
router.post("/", authMiddleware, requireRole("merchant"), upload.single("image"), createProduct);
router.put("/:id", authMiddleware, requireRole("merchant"), upload.single("image"), updateProduct);
router.delete("/:id", authMiddleware, requireRole("merchant"), deleteProduct);

module.exports = router;
