const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ItemModel', 
    required: true 
  },
  qty: { 
    type: Number, 
    required: true,
    min: [0.01, 'Quantity must be greater than zero.']
  },
  unitPrice: { 
    type: Number, 
    required: true,
    min: [0, 'Unit price cannot be negative.']
  }
});

const InvoiceSchema = new mongoose.Schema({
  partyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PartyModel', 
    default: null 
  }, // Nullable for anonymous run-time/walk-in cash sales
  invoiceType: { 
    type: String, 
    enum: ['Taxed', 'Non-Taxed'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Partially Paid'], 
    default: 'Pending' 
  },
  items: [InvoiceItemSchema],
  totalAmount: { 
    type: Number, 
    required: true,
    min: [0, 'Total amount cannot be negative.']
  }, // Subtotal before taxes
  taxAmount: { 
    type: Number, 
    default: 0,
    min: [0, 'Tax amount cannot be negative.']
  }, // Enforced to 0 via controller logic if invoiceType is 'Non-Taxed'
  grandTotal: { 
    type: Number, 
    required: true,
    min: [0, 'Grand total cannot be negative.']
  } // Final invoice amount (totalAmount + taxAmount)
}, { timestamps: true });

// Indexing for rapid sales reporting and accounting lookups
InvoiceSchema.index({ invoiceType: 1, paymentStatus: 1, createdAt: -1 });
InvoiceSchema.index({ partyId: 1 });

module.exports = mongoose.model('InvoiceModel', InvoiceSchema);