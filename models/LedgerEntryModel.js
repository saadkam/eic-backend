const mongoose = require('mongoose');

const LedgerEntrySchema = new mongoose.Schema({
  partyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PartyModel', 
    default: null 
  }, // Nullable for general company operating expenses (e.g., electricity, fuel)
  entryType: { 
    type: String, 
    enum: ['Sale', 'Purchase', 'Expense', 'Payment_Received', 'Payment_Paid'], 
    required: true 
  },
  referenceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }, // Seamlessly maps back to an InvoiceModel ID, a Purchase Order ID, or Expense Log ID
  debit: { 
    type: Number, 
    default: 0,
    min: [0, 'Debit value cannot be negative.']
  }, // Increases customer receivables, increases business assets
  credit: { 
    type: Number, 
    default: 0,
    min: [0, 'Credit value cannot be negative.']
  }, // Increases supplier payables, represents cash outgoing
  description: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// CRITICAL INDEXES: Essential for keeping live balance calculation pipelines blazing fast
LedgerEntrySchema.index({ partyId: 1, createdAt: -1 });
LedgerEntrySchema.index({ referenceId: 1 });

module.exports = mongoose.model('LedgerEntryModel', LedgerEntrySchema);