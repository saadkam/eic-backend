const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // New requirement added here
const formulaRoutes = require('./routes/formulaRoutes');
const partyRoutes = require('./routes/partyRoutes');
const productionRoutes = require('./routes/productionRoutes.js');
const salesRoutes = require('./routes/salesRoutes.js');
const dispatchRoutes = require('./routes/dispatchRoutes.js');
const app = express();

// Middleware configuration
app.use(cors()); // Grants your future React app permission to fetch data
app.use(express.json()); 

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/eic_db')
    .then(() => console.log('Successfully connected to MongoDB via Mongoose!'))
    .catch(err => console.error('MongoDB connection error:', err));

// orginise routes into a seperate file like index rout or api routs and only 
// have one rout directed inthis file to the file with all others
app.use('/api/party', partyRoutes);
app.use('/api/formulas', formulaRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dispatch', dispatchRoutes);

app.listen(PORT, () => {
    console.log(`EIC Modular Backend running on port ${PORT}`);
});