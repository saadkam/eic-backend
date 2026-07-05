const mongoose = require('mongoose');

const MarketCostSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  marketPrice: { type: Number, required: true }, // Overriding market price for dynamic costing
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MarketCostModel', MarketCostSchema);