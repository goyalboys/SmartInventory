const mongoose = require("mongoose");

const merchantProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

    inventoryTypes: {
      type: [String],
      default: [],
    },

    customCategories: {
      type: [String],
      default: [],
    },

    customSubcategories: {
      type: Map,
      of: [String],
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MerchantProfile", merchantProfileSchema);
