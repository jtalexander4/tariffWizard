const express = require("express");
const router = express.Router();
const metalPriceService = require("../services/metalPriceService");

// GET /api/metals/prices - Get all current metal prices
router.get("/prices", async (req, res) => {
  try {
    const prices = await metalPriceService.getAllMetalPrices();

    res.json({
      success: true,
      data: prices,
      lastUpdated: new Date().toISOString(),
      message: "Metal prices retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/metals/prices/:metal - Get specific metal price
router.get("/prices/:metal", async (req, res) => {
  try {
    const { metal } = req.params;
    const validMetals = ["copper", "aluminum"];

    if (!validMetals.includes(metal.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid metal. Supported metals: ${validMetals.join(", ")}`,
      });
    }

    const price = await metalPriceService.getMetalPrice(metal);

    res.json({
      success: true,
      data: {
        metal: metal,
        price: price,
        unit: "USD per kg",
        source: "LME (London Metal Exchange)",
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/metals/cache-status - Check cache status
router.get("/cache-status", (req, res) => {
  try {
    const status = metalPriceService.getCacheStatus();

    res.json({
      success: true,
      data: status,
      info: "Cache expires after 7 days to minimize API calls",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/metals/refresh-cache - Force refresh cache (admin only)
router.post("/refresh-cache", async (req, res) => {
  try {
    metalPriceService.clearCache();
    const prices = await metalPriceService.getAllMetalPrices();

    res.json({
      success: true,
      data: prices,
      message: "Cache refreshed and new prices fetched",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
