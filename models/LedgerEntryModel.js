const mongoose = require('mongoose');

const LedgerEntrySchema = new mongoose.Schema({
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', default: null }, // Null for standard non-party expenses
  entryType: { 
    type: String, 
    enum: ['Sale', 'Purchase', 'Expense', 'Payment_Received', 'Payment_Paid'], 
    required: true 
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Points back to InvoiceId, PurchaseId, etc.
  debit: { type: Number, default: 0 },  // Increases outstanding receivables or assets
  credit: { type: Number, default: 0 }, // Increases outstanding payables or represents cash out
  description: String
}, { timestamps: true });

module.exports = mongoose.model('LedgerEntryModel', LedgerEntrySchema);