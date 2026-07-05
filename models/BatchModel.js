const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  formulaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Formula', required: true },
  finishedGoodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'], 
    default: 'Pending' 
  },
  estimatedYield: { type: Number, required: true }, // Auto-calculated from formulation framework
  actualYield: { type: Number },                   // Adjusted manually by user before completion
  ingredientsUsed: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    qtyUsed: { type: Number }
  }]
}, { timestamps: true });

module.exports = mongoose.model('BatchModel', BatchSchema);