const mongoose = require('mongoose');

const ChallanItemSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ItemModel', 
    required: true 
  },
  qtyDispatched: { 
    type: Number, 
    required: true,
    min: [0.01, 'Dispatched quantity must be greater than zero.']
  }
});

const DeliveryChallanSchema = new mongoose.Schema({
  invoiceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'InvoiceModel', 
    required: true 
  },
  challanNumber: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  }, // e.g., DC-2026-0041
  itemsDispatched: [ChallanItemSchema],
  dispatchedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Dispatched', 'Delivered'], 
    default: 'Dispatched' 
  }
}, { timestamps: true });

// Optimize lookups for tracking pending shipments by invoice
DeliveryChallanSchema.index({ invoiceId: 1, challanNumber: 1 });

// =========================================================================
// MIDDLEWARE INTERCEPT PRE-SAVE HOOK (Taxed Invoice Validation Enforcer)
// =========================================================================
DeliveryChallanSchema.pre('save', async function() {
  const InvoiceModel = mongoose.model('InvoiceModel');
    const parentInvoice = await InvoiceModel.findById(this.invoiceId);
    
    if (!parentInvoice) {
      return next(new Error('Invalid Delivery Challan generation target: Parent Invoice not found.'));
    }
    
    // Strict compliance check: Lock delivery challans strictly to Taxed transactions
    if (parentInvoice.invoiceType !== 'Taxed') {
      return next(new Error(`Validation Failed: Delivery Challans cannot be generated for '${parentInvoice.invoiceType}' invoices.`));
    }
});

module.exports = mongoose.model('DeliveryChallanModel', DeliveryChallanSchema);