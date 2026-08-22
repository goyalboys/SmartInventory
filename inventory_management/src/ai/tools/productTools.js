const Product = require("../../models/Product");

/**
 * searchProducts — text search over product name/description.
 * Available to all authenticated users (read-only, public catalog data).
 */
const searchProducts = async ({ query, limit = 5 }, context) => {
  if (!query?.trim()) {
    return { success: false, error: "Search query is required" };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
  const regex = new RegExp(query.trim(), "i");

  const filter = {
    $or: [{ name: regex }, { description: regex }],
    quantity: { $gt: 0 },
  };

  // Merchants searching their own catalog can include out-of-stock items
  if (context.role === "merchant") {
    delete filter.quantity;
    filter.merchant = context.userId;
  }

  const products = await Product.find(filter)
    .populate("merchant", "name")
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  return {
    success: true,
    data: {
      query: query.trim(),
      count: products.length,
      products: products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        quantity: p.quantity,
        category: p.category,
        merchant: p.merchant ? { id: p.merchant._id.toString(), name: p.merchant.name } : null,
      })),
    },
  };
};

/**
 * getProductStock — stock level for a product by name or id.
 */
const getProductStock = async ({ productId, productName }, context) => {
  let product = null;

  if (productId) {
    product = await Product.findById(productId);
  } else if (productName) {
    const filter = { name: new RegExp(`^${productName.trim()}$`, "i") };
    if (context.role === "merchant") {
      filter.merchant = context.userId;
    }
    product = await Product.findOne(filter);
  } else {
    return { success: false, error: "productId or productName is required" };
  }

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  if (context.role === "merchant" && product.merchant.toString() !== context.userId) {
    return { success: false, error: "You are not authorized to view this product's stock" };
  }

  return {
    success: true,
    data: {
      id: product._id.toString(),
      name: product.name,
      quantity: product.quantity,
      inStock: product.quantity > 0,
    },
  };
};

module.exports = { searchProducts, getProductStock };
