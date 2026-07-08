const mongoose = require('mongoose');

// Safe run-time compilation of required models
const FormulaModel = mongoose.model('FormulaModel');
const BatchModel = mongoose.model('BatchModel');
const ItemModel = mongoose.model('ItemModel');

/**
 * Step 1: Calculate and preview scaled formula requirements before starting a batch
 * GET /api/production/scale-estimate
 */
const getBatchScaleEstimate = async (req, res) => {
  try {
    const { formulaId, method, targetValue, targetIngredientId } = req.query;

    if (!formulaId || !method || !targetValue) {
      return res.status(400).json({ success: false, message: 'Missing core scaling validation inputs.' });
    }

    const formula = await FormulaModel.findById(formulaId).populate('ingredients.itemId');
    if (!formula) {
      return res.status(404).json({ success: false, message: 'Master formula file not found.' });
    }

    // Calculate total baseline mass/parts of the original formula configuration
    const totalBaseMass = formula.ingredients.reduce((sum, ing) => sum + ing.value, 0);
    let scalingFactor = 1;

    // Execute custom dynamic calculation scaling formulas based on business requirements
    switch (method) {
      case 'Total Desired Weight':
        scalingFactor = Number(targetValue) / totalBaseMass;
        break;

      case 'Total Desired Yield':
        scalingFactor = Number(targetValue) / formula.baseYield;
        break;

      case 'Raw Material Availability':
        if (!targetIngredientId) {
          return res.status(400).json({ success: false, message: 'Ingredient ID required for material-based scaling.' });
        }
        const targetedIng = formula.ingredients.find(ing => ing.itemId._id.toString() === targetIngredientId);
        if (!targetedIng) {
          return res.status(400).json({ success: false, message: 'Selected ingredient not found in this formula.' });
        }
        scalingFactor = Number(targetValue) / targetedIng.value;
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid formula scaling method requested.' });
    }

    // Build the live runtime preview object matrix
    const scaledIngredients = formula.ingredients.map(ing => ({
      itemId: ing.itemId._id,
      name: ing.itemId.name,
      sku: ing.itemId.sku,
      unitOfMeasure: ing.itemId.unitOfMeasure,
      originalValue: ing.value,
      scaledQtyRequired: ing.value * scalingFactor
    }));

    const calculatedEstimatedYield = formula.baseYield * scalingFactor;

    return res.status(200).json({
      success: true,
      data: {
        formulaName: formula.productName,
        scalingMethodUsed: method,
        scalingFactor,
        estimatedYield: calculatedEstimatedYield,
        instructions: formula.instructions,
        ingredients: scaledIngredients
      }
    });

  } catch (error) {
    console.error('Error scaling formula parameters:', error);
    return res.status(500).json({ success: false, message: 'Server failed to calculate recipe scaling matrix.' });
  }
};

/**
 * Step 2: Finalize a running production run, adjust stock counts via ACID sessions
 * POST /api/production/complete-batch
 */
const completeBatchProduction = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { batchId, finalYieldOverride } = req.body;

    const batch = await BatchModel.findById(batchId).session(session);
    if (!batch) {
       await session.abortTransaction();
       return res.status(404).json({ success: false, message: 'Batch target log not found.' });
    }

    if (batch.status === 'Completed') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Batch has already been processed into inventory.' });
    }

    // Set user-overridden actual yield value or fallback to estimation math parameters
    const actualYieldValue = finalYieldOverride !== undefined ? Number(finalYieldOverride) : batch.estimatedYield;

    // 1. Deduct raw components out of your storage vaults
    // Maps directly to the static method we embedded in our ItemModel file
    await ItemModel.deductRawMaterials(batch.ingredientsUsed);

    // 2. Incremental update to credit newly mixed Finished Good output volumes
    await ItemModel.addProducedGoods(batch.finishedGoodId, actualYieldValue);

    // 3. Close the tracking status lifecycle safely
    batch.status = 'Completed';
    batch.actualYield = actualYieldValue;
    await batch.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Batch successfully matched. Stock levels adjusted and balance closed.',
      actualYield: actualYieldValue
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Production execution processing failed:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Critical error: Production run execution dropped. Inventory protected.',
      error: error.message 
    });
  }
};

module.exports = {
  getBatchScaleEstimate,
  completeBatchProduction
};