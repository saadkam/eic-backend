const express = require('express');
const router = express.Router();
const ChallanController = require('../controllers/deliveryChallanController');

// Creation endpoint path
router.post('/challan', ChallanController.createDeliveryChallan);

// Retrieval path for a given invoice tracking set
router.get('/invoice/:invoiceId', ChallanController.getChallansByInvoice);

module.exports = router;