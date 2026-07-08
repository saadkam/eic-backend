const mongoose = require('mongoose');

const BatchIngredientSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ItemModel', 
    required: true 
  },
  qtyUsed: { 
    type: Number, 
    required: true,
    min: [0, 'Quantity used cannot be negative.']
  } // Stores the final scaled quantity calculated for this specific production run
});

const BatchSchema = new mongoose.Schema({
  formulaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FormulaModel', 
    required: true 
  },
  finishedGoodId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ItemModel', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'], 
    default: 'Pending' 
  },
  scalingMethodUsed: {
    type: String,
    enum: ['Raw Material Availability', 'Total Desired Weight', 'Total Desired Yield'],
    required: true
  },
  estimatedYield: { 
    type: Number, 
    required: true,
    min: [0, 'Estimated yield must be a positive number.']
  }, // The theoretical calculation result
  actualYield: { 
    type: Number,
    min: [0, 'Actual yield cannot be negative.']
  }, // User updates/overrides this right before hitting complete batch
  batchInstructionsSnapshot: {
    type: String
  }, // Captures a historical snapshot of the formula instructions at runtime
  ingredientsUsed: [BatchIngredientSchema]
}, { timestamps: true });

// Optimize collection lookups for active batch monitoring dashboards
BatchSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BatchModel', BatchSchema);