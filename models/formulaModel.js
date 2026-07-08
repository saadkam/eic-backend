const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ItemModel', 
    required: true 
  },
  value: { 
    type: Number, 
    required: true,
    min: [0, 'Ingredient quantity value cannot be negative.'] 
  } // Keeps the raw user value untouched (e.g., 60, 1438, 0.65)
});

const FormulaSchema = new mongoose.Schema({
  productName: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  baseYield: {
    type: Number,
    required: true,
    min: [0, 'Base yield must be a positive number.']
  }, // The typical output quantity achieved using the exact baseline formula values above
  instructions: {
    type: String,
    trim: true,
    default: 'No specific mixing instructions provided for this formula.'
  }, // Holds standard operating procedures, temperature parameters, and mix times
  ingredients: [IngredientSchema]
}, { timestamps: true });


module.exports = mongoose.models.FormulaModel || mongoose.model('FormulaModel', FormulaSchema);