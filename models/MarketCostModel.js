const mongoose = require('mongoose');

const MarketCostSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ItemModel', 
    required: true,
    unique: true // Ensures each item has exactly one current market price record
  },
  marketPrice: { 
    type: Number, 
    required: true,
    min: [0, 'Market price cannot be negative.']
  }
}, { timestamps: true });

// Indexing itemId for fast lookup during formulation costing queries
MarketCostSchema.index({ itemId: 1 });

module.exports = mongoose.model('MarketCostModel', MarketCostSchema);