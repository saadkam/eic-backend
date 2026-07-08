const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  sku: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  type: { 
    type: String, 
    enum: ['Raw Material', 'Finished Good'], 
    required: true 
  },
  stockQty: { 
    type: Number, 
    default: 0,
    min: [0, 'Stock quantity cannot drop below zero. Please review raw material availability.']
  },
  unitOfMeasure: { 
    type: String, 
    required: true,
    enum: ['kg', 'L', 'g', 'mL', 'pcs'] // Scaled to cleanly support fluid/weight measures
  }
}, { timestamps: true });

// Create an optimized composite index on SKU and Type for rapid lookups in recipe scaling
ItemSchema.index({ sku: 1, type: 1 });

// =========================================================================
// STATIC UTILITY CORE METHODS (Inventory Mutations Engines)
// =========================================================================

/**
 * Deducts raw materials from stock when a manufacturing batch runs to completion
 * @param {Array} ingredients - Array of objects containing { itemId, qtyUsed }
 */
ItemSchema.statics.deductRawMaterials = async function(ingredients) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    for (const ingredient of ingredients) {
      const updatedItem = await this.findByIdAndUpdate(
        ingredient.itemId,
        { $inc: { stockQty: -ingredient.qtyUsed } },
        { runValidators: true, new: true, session }
      );
      
      if (!updatedItem) {
        throw new Error(`Inventory Item ID ${ingredient.itemId} not found during batch deduction.`);
      }
    }
    
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Adds newly produced actual yield into stock when a batch runs to completion
 * @param {String} finishedGoodId - ObjectId of the produced item
 * @param {Number} actualYield - User-verified total produced quantity
 */
ItemSchema.statics.addProducedGoods = async function(finishedGoodId, actualYield) {
  return await this.findByIdAndUpdate(
    finishedGoodId,
    { $inc: { stockQty: actualYield } },
    { runValidators: true, new: true }
  );
};

module.exports = mongoose.model('ItemModel', ItemSchema);