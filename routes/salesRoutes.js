const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');

// Main post processing checkpoint path
router.post('/invoice', InvoiceController.createInvoiceSale);

module.exports = router;