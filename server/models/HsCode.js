const mongoose = require("mongoose");

const hsCodeSchema = new mongoose.Schema(
  {
    hsCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 4,
      maxlength: 12,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient searching
hsCodeSchema.index({ description: "text" });

module.exports = mongoose.model("HsCode", hsCodeSchema);
