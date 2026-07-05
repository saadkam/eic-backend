const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true }
});

const InvoiceSchema = new mongoose.Schema({
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', default: null }, // Nullable for anonymous cash sales
  invoiceType: { type: String, enum: ['Taxed', 'Non-Taxed'], required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partially Paid'], default: 'Pending' },
  items: [InvoiceItemSchema],
  totalAmount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },        // Always 0 if invoiceType is 'Non-Taxed'
  grandTotal: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('InvoiceModel', InvoiceSchema);