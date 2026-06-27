const express = require('express');
const app = express();
app.use(express.json()); // Allows us to read JSON bodies

const PORT = process.env.PORT || 5000;

// Temporary In-Memory array for rapid prototyping (instead of full Mongo configuration right this second)
let mockFormulas = [
  {
    id: "1",
    productName: "Standard Alkyd Resin Enamel",
    ingredients: [
      { name: "Alkyd Resin Base", ratio: 55 },
      { name: "Titanium Dioxide (Pigment)", ratio: 20 },
      { name: "Solvent (Xylene)", ratio: 22 },
      { name: "Driers/Additives", ratio: 3 }
    ]
  }
];

// Endpoint 1: Get all baseline formulas
app.get('/api/formulas', (req, res) => {
    res.json(mockFormulas);
});

// Endpoint 2: Recalculate formulation based on total weight OR a specific ingredient's weight
app.post('/api/formulas/scale', (req, res) => {
    const { formulaId, targetBatchWeight, targetIngredientName, targetIngredientWeight } = req.body;
    
    const formula = mockFormulas.find(f => f.id === formulaId);
    if (!formula) return res.status(404).json({ error: "Formula not found" });

    const totalParts = formula.ingredients.reduce((sum, ing) => sum + ing.ratio, 0);
    let scaleFactor = 0;
    let finalBatchWeight = 0;

    // SCENARIO A: Scaling based on a single selected raw material constraint
    if (targetIngredientName && targetIngredientWeight) {
        const targetIngredient = formula.ingredients.find(ing => ing.name === targetIngredientName);
        if (!targetIngredient) {
            return res.status(400).json({ error: `Ingredient '${targetIngredientName}' not found in this formula.` });
        }
        
        // Factor = target weight / its baseline ratio part
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

    // Map and calculate weights for all components using the scale factor
    const scaledIngredients = formula.ingredients.map(ing => {
        const calculatedWeight = ing.ratio * scaleFactor;
        return {
            name: ing.name,
            baseRatio: ing.ratio,
            requiredWeight: parseFloat(calculatedWeight.toFixed(3)) // Rounding to 3 decimals (grams precision)
        };
    });

    res.json({
        productName: formula.productName,
        calculatedTotalBatchWeight: parseFloat(finalBatchWeight.toFixed(3)),
        scaledIngredients
    });
});

// Endpoint 3: Add a new custom formula configuration
app.post('/api/formulas', (req, res) => {
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

    // Generate a simple unique ID for prototyping
    const newFormula = {
        id: (mockFormulas.length + 1).toString(),
        productName,
        description: description || "",
        ingredients
    };

    mockFormulas.push(newFormula);

    res.status(201).json({
        message: "Formula added successfully!",
        formula: newFormula
    });
});

app.listen(PORT, () => {
    console.log(`EIC Prototype Server running on port ${PORT}`);
});