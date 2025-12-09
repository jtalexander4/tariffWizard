const mongoose = require('mongoose');

const section99CodeSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  code: { type: String, required: true }, // e.g., "9903.78.01"
  dutyRate: { type: String, required: true }, // e.g., "50%"
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Section99Code', section99CodeSchema);