const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['Raw Material', 'Finished Good'], 
    required: true 
  },
  stockQty: { type: Number, default: 0 },       // Real-time physical inventory count
  unitOfMeasure: { type: String, required: true } // e.g., 'kg', 'Liters'
}, { timestamps: true });

module.exports = mongoose.model('ItemModel', ItemSchema);