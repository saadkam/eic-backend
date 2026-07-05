const Formula = require('../models/formulaModel');

/**
 * Pure calculation engine to scale ingredients by total weight OR specific ingredient constraints.
 * @param {Array} ingredients - Array of { name, ratio }
 * @param {Number} targetBatchWeight 
 * @param {String} targetIngredientName 
 * @param {Number} targetIngredientWeight 
 * @returns {Object} { calculatedTotalBatchWeight, scaledIngredients }
 */
const calculateScaledFormulation = (ingredients, targetBatchWeight, targetIngredientName, targetIngredientWeight) => {
    const totalParts = ingredients.reduce((sum, ing) => sum + ing.ratio, 0);
    let scaleFactor = 0;
    let finalBatchWeight = 0;

    // Scenario A: Scaling based on a single selected raw material constraint
    if (targetIngredientName && targetIngredientWeight) {
        const targetIngredient = ingredients.find(ing => ing.name === targetIngredientName);
        if (!targetIngredient) {
            throw new Error(`Ingredient '${targetIngredientName}' not found in the formula profile.`);
        }
        scaleFactor = targetIngredientWeight / targetIngredient.ratio;
        finalBatchWeight = totalParts * scaleFactor;
    } 
    // Scenario B: Scaling based on overall total target batch size
    else if (targetBatchWeight) {
        scaleFactor = targetBatchWeight / totalParts;
        finalBatchWeight = targetBatchWeight;
    } 
    else {
        throw new Error("Please provide either targetBatchWeight OR targetIngredientName + targetIngredientWeight");
    }

    // Map and calculate weights for all components using the scale factor
    const scaledIngredients = ingredients.map(ing => ({
        name: ing.name,
        baseRatio: ing.ratio,
        requiredWeight: parseFloat((ing.ratio * scaleFactor).toFixed(3)) // Gram precision
    }));

    return {
        calculatedTotalBatchWeight: parseFloat(finalBatchWeight.toFixed(3)),
        scaledIngredients
    };
};

// 1. Get a list of all available formulas (Your Endpoint 1)
exports.getAllFormulas = async (req, res) => {
    try {
        const formulasFromDb = await Formula.find();
        const formulaList = formulasFromDb.map(f => ({
            id: f._id,
            productName: f.productName,
            description: f.description,
            ingredients: f.ingredients
        }));
        res.json(formulaList);
    } catch (error) {
        console.error("Failed to fetch formulas:", error);
        res.status(500).json({ error: "Failed to retrieve formulas from the database" });
    }
};

// 2. Recalculate formulation based on database record values (Your Endpoint 2)
exports.scaleFormula = async (req, res) => {
    const { formulaId, targetBatchWeight, targetIngredientName, targetIngredientWeight } = req.body;
    
    try {
        const formula = await Formula.findById(formulaId);
        if (!formula) {
            return res.status(404).json({ error: "Formula not found in database." });
        }

        // Execute calculations using our shared utility function
        const calculations = calculateScaledFormulation(
            formula.ingredients, 
            targetBatchWeight, 
            targetIngredientName, 
            targetIngredientWeight
        );

        res.json({
            productName: formula.productName,
            ...calculations
        });

    } catch (error) {
        console.error("Database scaling engine error:", error.message);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: "Invalid formulaId format passed." });
        }
        res.status(400).json({ error: error.message || "Internal server calculation error." });
    }
};

exports.scaleAdHocFormula = async (req, res) => {
    const { ingredients, targetBatchWeight, targetIngredientName, targetIngredientWeight } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "A non-empty array of ingredients is required for on-the-fly scaling." });
    }

    // Validate incoming data schema to avoid bad math states
    for (let ing of ingredients) {
        if (!ing.name || typeof ing.ratio !== 'number' || ing.ratio <= 0) {
            return res.status(400).json({ error: "Each ingredient must have a valid name and a numeric ratio greater than 0." });
        }
    }

    try {
        // Execute calculations using the exact same shared utility function
        const calculations = calculateScaledFormulation(
            ingredients, 
            targetBatchWeight, 
            targetIngredientName, 
            targetIngredientWeight
        );

        res.json({
            productName: "Ad-Hoc / Trial Formula",
            ...calculations
        });

    } catch (error) {
        console.error("Ad-hoc scaling engine error:", error.message);
        res.status(400).json({ error: error.message || "Internal calculation error on ad-hoc formula profile." });
    }
};

// 3. Add a new custom formula configuration (Your Endpoint 3)
exports.createFormula = async (req, res) => {
    const { productName, description, ingredients } = req.body;

    if (!productName || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "Product name and a non-empty list of ingredients are required." });
    }

    for (let ing of ingredients) {
        if (!ing.name || typeof ing.ratio !== 'number' || ing.ratio <= 0) {
            return res.status(400).json({ error: "Each ingredient must have a valid name and a numeric ratio greater than 0." });
        }
    }

    try {
        const newFormula = new Formula({ productName, description, ingredients });
        await newFormula.save(); 
        res.status(201).json({ message: "Formula saved to database!", formula: newFormula });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};