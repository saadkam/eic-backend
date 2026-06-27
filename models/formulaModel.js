const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  name: String,
  ratio: Number // e.g., 0.60 for 60% of the mix, or parts by weight
});

const FormulaSchema = new mongoose.Schema({
  productName: { type: String, required: true, unique: true },
  description: String,
  ingredients: [IngredientSchema]
});

module.exports = mongoose.Schema('Formula', FormulaSchema);