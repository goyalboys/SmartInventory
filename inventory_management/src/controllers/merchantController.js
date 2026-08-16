const MerchantProfile = require("../models/MerchantProfile");
const {
  toCategoryOptions,
  getMergedCategoryValues,
} = require("../utils/categoryHelpers");

const listMerchants = async (req, res) => {
  try {
    const filter = {};

    if (req.query.city) {
      filter.city = new RegExp(req.query.city, "i");
    }

    if (req.query.category) {
      filter.inventoryTypes = req.query.category;
    }

    const profiles = await MerchantProfile.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ merchants: profiles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMerchant = async (req, res) => {
  try {
    const profile = await MerchantProfile.findOne({ user: req.params.id }).populate(
      "user",
      "name email"
    );

    if (!profile) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    res.json({ merchant: profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const profile = await MerchantProfile.findOne({ user: req.userId });

    if (!profile) {
      return res.status(404).json({ message: "Merchant profile not found" });
    }

    res.json({
      profile,
      categories: toCategoryOptions(
        getMergedCategoryValues(profile.customCategories || [])
      ),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const { storeName, description, address, city, state, pincode, inventoryTypes } = req.body;

    const update = {};
    if (storeName !== undefined) update.storeName = storeName;
    if (description !== undefined) update.description = description;
    if (address !== undefined) update.address = address;
    if (city !== undefined) update.city = city;
    if (state !== undefined) update.state = state;
    if (pincode !== undefined) update.pincode = pincode;
    if (inventoryTypes !== undefined) {
      update.inventoryTypes = Array.isArray(inventoryTypes)
        ? inventoryTypes
        : JSON.parse(inventoryTypes);
    }

    const profile = await MerchantProfile.findOneAndUpdate(
      { user: req.userId },
      update,
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Merchant profile not found" });
    }

    res.json({ profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  listMerchants,
  getMerchant,
  getMyProfile,
  updateMyProfile,
};
