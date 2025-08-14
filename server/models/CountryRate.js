const mongoose = require("mongoose");

const countryRateSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    countryCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 3,
    },
    adValoremRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    rateCode: {
      type: String,
      trim: true,
      uppercase: true,
      // Examples: "9903.88.15", "9903.89.01", etc.
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    expirationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient searching
countryRateSchema.index({ country: 1 });
countryRateSchema.index({ countryCode: 1 });
countryRateSchema.index({ isActive: 1 });

module.exports = mongoose.model("CountryRate", countryRateSchema);
