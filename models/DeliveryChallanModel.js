const mongoose = require('mongoose');

const ChallanItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  qtyDispatched: { type: Number, required: true }
});

const DeliveryChallanSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  challanNumber: { type: String, required: true, unique: true },
  itemsDispatched: [ChallanItemSchema],
  dispatchedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Dispatched', 'Delivered'], default: 'Dispatched' }
});

// Application/Hook validation: Ensure the related invoice is 'Taxed' before saving
DeliveryChallanSchema.pre('save', async function(next) {
  const Invoice = mongoose.model('Invoice');
  const parentInvoice = await Invoice.findById(this.invoiceId);
  if (!parentInvoice || parentInvoice.invoiceType !== 'Taxed') {
    return next(new Error('Delivery Challans can only be generated for Taxed Invoices.'));
  }
  next();
});

module.exports = mongoose.model('DeliveryChallanModel', DeliveryChallanSchema);