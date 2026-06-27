const express = require('express');
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/eic_db')
const Formula = require('./models/formulaModel');

const app = express();
app.use(express.json()); // Allows us to read JSON bodies

const PORT = process.env.PORT || 5000;

// Endpoint 1: Get a list of all available formulas directly from MongoDB
app.get('/api/formulas', async (req, res) => {
    try {
        // Fetch all formula documents from the collection
        const formulasFromDb = await Formula.find();

        // Map them cleanly so the frontend gets a predictable format (including MongoDB's _id)
        const formulaList = formulasFromDb.map(f => ({
            id: f._id, // MongoDB's unique identifier
            productName: f.productName,
            description: f.description,
            ingredients: f.ingredients // Included so your frontend UI can map out the base ingredient rows immediately
        }));

        res.json(formulaList);
    } catch (error) {
        console.error("Failed to fetch formulas:", error);
        res.status(500).json({ error: "Failed to retrieve formulas from the database" });
    }
});

// Endpoint 2: Recalculate formulation based on database record values
app.post('/api/formulas/scale', async (req, res) => {
    const { formulaId, targetBatchWeight, targetIngredientName, targetIngredientWeight } = req.body;
    
    try {
        // Query MongoDB by the record's unique Hex ID
        const formula = await Formula.findById(formulaId);
        if (!formula) {
            return res.status(404).json({ error: "Formula not found in database." });
        }

        // The scaling calculation logic stays exactly the same
        const totalParts = formula.ingredients.reduce((sum, ing) => sum + ing.ratio, 0);
        let scaleFactor = 0;
        let finalBatchWeight = 0;
        console.log(targetIngredientName);
        // SCENARIO A: Scaling based on a single selected raw material constraint
        if (targetIngredientName && targetIngredientWeight) {
            const targetIngredient = formula.ingredients.find(ing => ing.name === targetIngredientName);
            if (!targetIngredient) {
                return res.status(400).json({ error: `Ingredient '${targetIngredientName}' not found in this formula.` });
            }
            
            scaleFactor = targetIngredientWeight / targetIngredient.ratio;
            finalBatchWeight = totalParts * scaleFactor;
        } 
        // SCENARIO B: Scaling based on overall total target batch size
        else if (targetBatchWeight) {
            scaleFactor = targetBatchWeight / totalParts;
            finalBatchWeight = targetBatchWeight;
        } 
        else {
            return res.status(400).json({ error: "Please provide either targetBatchWeight OR targetIngredientName + targetIngredientWeight" });
        }

        // Map and calculate weights for all components using the database ratios
        const scaledIngredients = formula.ingredients.map(ing => {
            const calculatedWeight = ing.ratio * scaleFactor;
            return {
                name: ing.name,
                baseRatio: ing.ratio,
                requiredWeight: parseFloat(calculatedWeight.toFixed(3)) // Gram precision
            };
        });

        res.json({
            productName: formula.productName,
            calculatedTotalBatchWeight: parseFloat(finalBatchWeight.toFixed(3)),
            scaledIngredients
        });

    } catch (error) {
        console.error("Scaling error:", error);
        // Catch invalid MongoDB ObjectIDs (e.g. if the string sent isn't 24 characters long)
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: "Invalid formulaId format passed." });
        }
        res.status(500).json({ error: "Internal server calculation error." });
    }
});

// Endpoint 3: Add a new custom formula configuration
app.post('/api/formulas', async (req, res) => {
    const { productName, description, ingredients } = req.body;

    // Basic validation to protect batch math
    if (!productName || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "Product name and a non-empty list of ingredients are required." });
    }

    // Verify all ingredients have a valid numeric parts/ratio layout
    for (let ing of ingredients) {
        if (!ing.name || typeof ing.ratio !== 'number' || ing.ratio <= 0) {
            return res.status(400).json({ error: "Each ingredient must have a valid name and a numeric ratio greater than 0." });
        }
    }

    try {
        // Line A: This creates a new document instance in memory based on your schema
        const newFormula = new Formula({ productName, description, ingredients });
        
        // LINE B (THE ACTUAL PUSH): This tells Mongoose to send the JSON data 
        // over the network to the MongoDB container and permanently write it to disk.
        await newFormula.save(); 
        
        res.status(201).json({ message: "Formula saved to database!", formula: newFormula });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`EIC Prototype Server running on port ${PORT}`);
});