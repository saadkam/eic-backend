const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    enum: ['Customer', 'Supplier', 'Both'], 
    required: true 
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  ntnNumber: { 
    type: String, 
    default: null,
    trim: true,
    uppercase: true // Standardizes NTN formats (e.g., 1234567-8)
  }
}, { timestamps: true });

// Index for ultra-fast customer/supplier lookups and filtering
PartySchema.index({ type: 1, name: 1 });

module.exports = mongoose.model('PartyModel', PartySchema);