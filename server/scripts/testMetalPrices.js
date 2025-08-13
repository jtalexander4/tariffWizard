const metalPriceService = require("../services/metalPriceService");

const testMetalPrices = async () => {
  console.log("🧪 Testing Metal Price Service...\n");

  try {
    // Test cache status first
    console.log("📊 Cache Status:");
    const cacheStatus = metalPriceService.getCacheStatus();
    console.log(JSON.stringify(cacheStatus, null, 2));

    console.log("\n🔍 Testing individual metal prices...");

    // Test with mock data if API key not configured
    if (
      !process.env.METAL_PRICE_API_KEY ||
      process.env.METAL_PRICE_API_KEY === "your_api_key_here"
    ) {
      console.log(
        "⚠️  No API key configured - testing cache functionality only"
      );

      // Simulate cached data for testing (updated for kg pricing)
      metalPriceService.cache.set("copper_price", {
        price: 9.15,
        timestamp: Date.now(),
      });
      metalPriceService.cache.set("aluminum_price", {
        price: 1.82,
        timestamp: Date.now(),
      });

      const mockPrices = await metalPriceService.getAllMetalPrices();
      console.log("\n🏭 Mock LME Metal Prices:");
      Object.entries(mockPrices).forEach(([metal, price]) => {
        console.log(`  ${metal}: $${price}/kg`);
      });
    } else {
      console.log("🌐 Testing with live metals.dev API...");

      // Clear cache first to test fresh data
      metalPriceService.clearCache();

      // Test live API
      const prices = await metalPriceService.getAllMetalPrices();
      console.log("\n🏭 Current LME Metal Prices:");
      Object.entries(prices).forEach(([metal, price]) => {
        if (price) {
          console.log(`  ${metal}: $${price}/kg`);
        } else {
          console.log(`  ${metal}: Failed to fetch`);
        }
      });
    }

    console.log("\n✅ Metal Price Service test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing metal price service:", error.message);
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testMetalPrices().then(() => process.exit(0));
}

module.exports = { testMetalPrices };
