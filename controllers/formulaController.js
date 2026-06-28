const Formula = require('../models/formulaModel');

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

        const totalParts = formula.ingredients.reduce((sum, ing) => sum + ing.ratio, 0);
        let scaleFactor = 0;
        let finalBatchWeight = 0;

        if (targetIngredientName && targetIngredientWeight) {
            const targetIngredient = formula.ingredients.find(ing => ing.name === targetIngredientName);
            if (!targetIngredient) {
                return res.status(400).json({ error: `Ingredient '${targetIngredientName}' not found in this formula.` });
            }
            scaleFactor = targetIngredientWeight / targetIngredient.ratio;
            finalBatchWeight = totalParts * scaleFactor;
        } 
        else if (targetBatchWeight) {
            scaleFactor = targetBatchWeight / totalParts;
            finalBatchWeight = targetBatchWeight;
        } 
        else {
            return res.status(400).json({ error: "Please provide either targetBatchWeight OR targetIngredientName + targetIngredientWeight" });
        }

        const scaledIngredients = formula.ingredients.map(ing => {
            const calculatedWeight = ing.ratio * scaleFactor;
            return {
                name: ing.name,
                baseRatio: ing.ratio,
                requiredWeight: parseFloat(calculatedWeight.toFixed(3))
            };
        });

        res.json({
            productName: formula.productName,
            calculatedTotalBatchWeight: parseFloat(finalBatchWeight.toFixed(3)),
            scaledIngredients
        });

    } catch (error) {
        console.error("Scaling error:", error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: "Invalid formulaId format passed." });
        }
        res.status(500).json({ error: "Internal server calculation error." });
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