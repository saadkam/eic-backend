const express = require('express');
const router = express.Router();
const BatchController = require('../controllers/batchController');

// Calculation estimation view route
router.get('/scale-estimate', BatchController.getBatchScaleEstimate);

// Transaction processing checkout completion route
router.post('/complete-batch', BatchController.completeBatchProduction);

module.exports = router;