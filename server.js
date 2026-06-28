const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // New requirement added here
const formulaRoutes = require('./routes/formulaRoutes');

const app = express();

// Middleware configuration
app.use(cors()); // Grants your future React app permission to fetch data
app.use(express.json()); 

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/eic_db')
    .then(() => console.log('Successfully connected to MongoDB via Mongoose!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Register Modular Routes
app.use('/api/formulas', formulaRoutes);

app.listen(PORT, () => {
    console.log(`EIC Modular Backend running on port ${PORT}`);
});