const mongoose = require("mongoose");

const hsCodeSchema = new mongoose.Schema(
  {
    hsCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 4,
      maxlength: 10,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    normalTariffRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    unit: {
      type: String,
      default: "percent",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient searching
hsCodeSchema.index({ hsCode: 1 });
hsCodeSchema.index({ description: "text" });

module.exports = mongoose.model("HsCode", hsCodeSchema);
