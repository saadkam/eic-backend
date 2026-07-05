const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Customer', 'Supplier', 'Both'], required: true },
  phone: String,
  address: String,
  description: String,
  ntnNumber: { type: String, default: null } 
}, { timestamps: true });

module.exports = mongoose.model('PartyModel', PartySchema);