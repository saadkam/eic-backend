const mongoose = require('mongoose');

// Safe run-time compilation of required models
const InvoiceModel = mongoose.model('InvoiceModel');
const DeliveryChallanModel = mongoose.model('DeliveryChallanModel');

/**
 * Generate a new Delivery Challan (Supports Partial Shipments)
 * POST /api/dispatch/challan
 */
const createDeliveryChallan = async (req, res) => {
  try {
    const { invoiceId, challanNumber, itemsDispatched } = req.body;

    if (!invoiceId || !challanNumber || !itemsDispatched || itemsDispatched.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing core delivery challan data payload.' });
    }

    // 1. Fetch the parent invoice to verify existence and check items
    const parentInvoice = await InvoiceModel.findById(invoiceId);
    if (!parentInvoice) {
      return res.status(404).json({ success: false, message: 'Parent sales invoice not found.' });
    }

    // Note: The model pre-save hook will automatically block this if invoiceType !== 'Taxed',
    // but checking it here gives a cleaner, faster API message to the user frontend.
    if (parentInvoice.invoiceType !== 'Taxed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Compliance Restriction: Delivery Challans can only be generated for Taxed Invoices.' 
      });
    }

    // 2. Aggregate previously shipped amounts for this invoice to handle partial shipment math
    const existingChallans = await DeliveryChallanModel.find({ invoiceId });
    
    // Create a running total map of what has already been dispatched across past DC configurations
    const shippedTotalsMap = {};
    existingChallans.forEach(dc => {
      dc.itemsDispatched.forEach(item => {
        shippedTotalsMap[item.itemId.toString()] = (shippedTotalsMap[item.itemId.toString()] || 0) + item.qtyDispatched;
      });
    });

    // 3. Validate requested quantities against original invoice allowances
    for (const shipItem of itemsDispatched) {
      const originalInvoiceItem = parentInvoice.items.find(
        item => item.itemId.toString() === shipItem.itemId.toString()
      );

      if (!originalInvoiceItem) {
        return res.status(400).json({ 
          success: false, 
          message: `Item ID ${shipItem.itemId} does not exist inside the target invoice declaration.` 
        });
      }

      const alreadyShipped = shippedTotalsMap[shipItem.itemId.toString()] || 0;
      const totalAttemptedDispatch = alreadyShipped + shipItem.qtyDispatched;

      if (totalAttemptedDispatch > originalInvoiceItem.qty) {
        return res.status(400).json({
          success: false,
          message: `Over-dispatch violation for item! Invoice order qty: ${originalInvoiceItem.qty}. Already shipped: ${alreadyShipped}. Attempted new shipment: ${shipItem.qtyDispatched}.`
        });
      }
    }

    // 4. Save and generate the Delivery Challan document (Triggers the schema pre-save hook)
    const newChallan = await DeliveryChallanModel.create({
      invoiceId,
      challanNumber,
      itemsDispatched,
      status: 'Dispatched'
    });

    return res.status(201).json({
      success: true,
      message: 'Delivery Challan generated successfully and recorded under invoice framework.',
      data: newChallan
    });

  } catch (error) {
    console.error('Error generating Delivery Challan:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process shipping document execution.', 
      error: error.message 
    });
  }
};

/**
 * Fetch all Delivery Challans linked to a single Invoice
 * GET /api/dispatch/invoice/:invoiceId
 */
const getChallansByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const challans = await DeliveryChallanModel.find({ invoiceId }).sort({ dispatchedAt: -1 });

    return res.status(200).json({
      success: true,
      count: challans.length,
      data: challans
    });
  } catch (error) {
    console.error('Error fetching challan logs:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving related delivery tracks.' });
  }
};

module.exports = {
  createDeliveryChallan,
  getChallansByInvoice
};