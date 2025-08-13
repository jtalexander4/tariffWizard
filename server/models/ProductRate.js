const mongoose = require("mongoose");

const productRateSchema = new mongoose.Schema(
  {
    hsCode: {
      type: String,
      required: true,
      trim: true,
      ref: "HsCode",
    },
    specialProductRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    productDescription: {
      type: String,
      trim: true,
    },
    rateType: {
      type: String,
      enum: [
        "antidumping",
        "countervailing",
        "section232",
        "section301",
        "other",
      ],
      required: true,
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

// Compound index for HS Code and rate type
productRateSchema.index({ hsCode: 1, rateType: 1 });
productRateSchema.index({ isActive: 1 });

module.exports = mongoose.model("ProductRate", productRateSchema);
