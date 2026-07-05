const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  ratio: { type: Number, required: true } // e.g., 0.60 for 60% of total batch weight
});

const FormulaSchema = new mongoose.Schema({
  productName: { type: String, required: true, unique: true },
  description: String,
  ingredients: [IngredientSchema]
});

module.exports = mongoose.model('FormulaModel', FormulaSchema);