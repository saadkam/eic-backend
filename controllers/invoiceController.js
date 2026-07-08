const mongoose = require('mongoose');

// Safe run-time compilation of required models
const InvoiceModel = mongoose.model('InvoiceModel');
const ItemModel = mongoose.model('ItemModel');
const LedgerEntryModel = mongoose.model('LedgerEntryModel');

/**
 * Create and process a new sale (Taxed Credit, Non-Taxed Cash, etc.)
 * POST /api/sales/invoice
 */
const createInvoiceSale = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { 
      partyId, 
      invoiceType, 
      paymentStatus, // 'Paid' (Cash) or 'Pending' (Credit)
      items // Array of objects: [{ itemId, qty, unitPrice }]
    } = req.body;

    if (!invoiceType || !items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Missing core invoice structural requirements.' });
    }

    let subtotal = 0;
    const processedItems = [];

    // 1. Loop through items to calculate subtotal and run warehouse integrity validations
    for (const item of items) {
      const inventoryItem = await ItemModel.findById(item.itemId).session(session);
      if (!inventoryItem || inventoryItem.type !== 'Finished Good') {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: `Finished Good Item ID ${item.itemId} not found.` });
      }

      // Check stock limits before making a sale
      if (inventoryItem.stockQty < item.qty) {
        await session.abortTransaction();
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient inventory for ${inventoryItem.name}. Available: ${inventoryItem.stockQty}, Requested: ${item.qty}` 
        });
      }

      const itemTotal = item.qty * item.unitPrice;
      subtotal += itemTotal;

      processedItems.push({
        itemId: item.itemId,
        qty: item.qty,
        unitPrice: item.unitPrice
      });

      // Deduct sold goods out of physical warehouse inventory stock immediately
      inventoryItem.stockQty -= item.qty;
      await inventoryItem.save({ session });
    }

    // 2. Conditionally apply taxes based on the chosen single-table invoice schema indicator
    const SALES_TAX_RATE = 0.18; // 18% Standard Sales Tax
    const taxAmount = invoiceType === 'Taxed' ? subtotal * SALES_TAX_RATE : 0;
    const grandTotal = subtotal + taxAmount;

    // 3. Save the core Invoice document inside MongoDB
    const newInvoice = await InvoiceModel.create([{
      partyId: partyId || null, // Nullable for walk-in anonymous retail
      invoiceType,
      paymentStatus: paymentStatus || 'Pending',
      items: processedItems,
      totalAmount: subtotal,
      taxAmount,
      grandTotal
    }], { session });

    const invoiceId = newInvoice[0]._id;

    // 4. Double-Entry Financial Ledger Writing Sequence
    // Always write the original base sale debit transaction first
    await LedgerEntryModel.create([{
      partyId: partyId || null,
      entryType: 'Sale',
      referenceId: invoiceId,
      debit: grandTotal,
      credit: 0,
      description: `${invoiceType} Sales Invoice verification run posted to books.`
    }], { session });

    // If payment status is marked as 'Paid' up-front, instantly clear the liability row
    if (paymentStatus === 'Paid') {
      await LedgerEntryModel.create([{
        partyId: partyId || null,
        entryType: 'Payment_Received',
        referenceId: invoiceId,
        debit: 0,
        credit: grandTotal,
        description: `Immediate checkout cash settlement received against Invoice ref token.`
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: 'Sale finalized successfully. Inventory adjusted and ledger balanced.',
      data: newInvoice[0]
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Critical Sales Processing Engine Crash:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Invoice execution failed. Financial data and inventory structures protected.',
      error: error.message 
    });
  }
};

module.exports = {
  createInvoiceSale
};