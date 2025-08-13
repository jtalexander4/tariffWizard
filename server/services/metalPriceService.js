const axios = require("axios");

class MetalPriceService {
  constructor() {
    this.baseURL = "https://api.metals.dev/v1";
    this.apiKey = process.env.METAL_PRICE_API_KEY; // You'll need to add this to your .env
    this.cache = new Map();
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  }

  /**
   * Get cached price or fetch new one if expired
   */
  async getMetalPrice(metal) {
    const cacheKey = `${metal}_price`;
    const cached = this.cache.get(cacheKey);

    // Check if we have valid cached data
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`📦 Using cached ${metal} price: $${cached.price}/kg`);
      return cached.price;
    }

    // Fetch new price
    try {
      const price = await this.fetchMetalPrice(metal);

      // Cache the result
      this.cache.set(cacheKey, {
        price: price,
        timestamp: Date.now(),
      });

      console.log(`🔄 Fetched fresh ${metal} price: $${price}/kg`);
      return price;
    } catch (error) {
      // If API fails and we have cached data, use it even if expired
      if (cached) {
        console.log(
          `⚠️  API failed, using expired cached ${metal} price: $${cached.price}/kg`
        );
        return cached.price;
      }
      throw error;
    }
  }

  /**
   * Fetch current metal price from API
   */
  async fetchMetalPrice(metal) {
    if (!this.apiKey) {
      throw new Error("METAL_PRICE_API_KEY environment variable not set");
    }

    // Map metals to LME symbols
    const metalSymbols = {
      copper: "lme_copper",
      aluminum: "lme_aluminum",
    };

    const symbol = metalSymbols[metal.toLowerCase()];
    if (!symbol) {
      throw new Error(
        `Unsupported metal: ${metal}. Supported: copper, aluminum`
      );
    }

    try {
      const response = await axios.get(`${this.baseURL}/latest`, {
        params: {
          api_key: this.apiKey,
          currency: "USD",
          unit: "kg", // Price per kilogram
        },
        timeout: 10000,
      });

      console.log(
        `API Response for ${metal}:`,
        JSON.stringify(response.data, null, 2)
      );

      // Check for success status (metals.dev uses "status": "success")
      if (response.data.status !== "success") {
        throw new Error(
          `API Error: ${
            response.data.error?.message ||
            response.data.status ||
            "Unknown error"
          }`
        );
      }

      // Extract price from response
      let price;
      if (response.data.metals && response.data.metals[symbol]) {
        price = response.data.metals[symbol];
      } else {
        throw new Error(
          `Price not found for ${metal} (${symbol}) in API response`
        );
      }

      console.log(`💰 ${metal} LME price: $${price}/kg`);
      return price;
    } catch (error) {
      // If it's a network/API error and we have a fallback, use it
      if (this.hasFallbackPrice(metal)) {
        console.log(
          `API failed for ${metal}, using fallback pricing:`,
          error.message
        );
        return this.getFallbackPrice(metal);
      }

      if (error.response) {
        throw new Error(
          `Metals.dev API Error: ${error.response.status} - ${
            error.response.data?.error?.message || error.message
          }`
        );
      }
      throw new Error(`Failed to fetch ${metal} price: ${error.message}`);
    }
  }

  /**
   * Get fallback prices for metals (in USD per kg)
   */
  getFallbackPrice(metal) {
    // These are approximate LME prices (as of Aug 2025) in USD per kg
    const fallbackPrices = {
      copper: 9.15, // USD per kg
      aluminum: 1.82, // USD per kg
    };

    const price = fallbackPrices[metal.toLowerCase()];
    if (!price) {
      throw new Error(`No fallback price available for ${metal}`);
    }

    console.log(`📋 Using fallback price for ${metal}: $${price}/kg`);
    return price;
  }

  /**
   * Check if we have a fallback price for this metal
   */
  hasFallbackPrice(metal) {
    const fallbackPrices = ["copper", "aluminum"];
    return fallbackPrices.includes(metal.toLowerCase());
  }

  /**
   * Get all metal prices at once
   */
  async getAllMetalPrices() {
    const metals = ["copper", "aluminum"];
    const prices = {};

    for (const metal of metals) {
      try {
        prices[metal] = await this.getMetalPrice(metal);
      } catch (error) {
        console.error(`Failed to get ${metal} price:`, error.message);
        prices[metal] = null;
      }
    }

    return prices;
  }

  /**
   * Check cache status
   */
  getCacheStatus() {
    const status = {};
    const metals = ["copper", "aluminum"];

    metals.forEach((metal) => {
      const cacheKey = `${metal}_price`;
      const cached = this.cache.get(cacheKey);

      if (cached) {
        const age = Date.now() - cached.timestamp;
        const isExpired = age > this.cacheExpiry;
        status[metal] = {
          price: cached.price,
          lastUpdated: new Date(cached.timestamp).toISOString(),
          ageHours: Math.round(age / (1000 * 60 * 60)),
          isExpired: isExpired,
        };
      } else {
        status[metal] = { cached: false };
      }
    });

    return status;
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache() {
    this.cache.clear();
    console.log("🗑️  Metal price cache cleared");
  }
}

module.exports = new MetalPriceService();
