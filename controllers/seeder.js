const mongoose = require('mongoose');

const ItemModel = require('../models/ItemModel'); // Adjust paths to where your models actually live
const MarketCostModel = require('../models/MarketCostModel');
const FormulaModel = require('../models/FormulaModel');
const BatchModel = require('../models/BatchModel');
const PartyModel = require('../models/PartyModel');
const InvoiceModel = require('../models/InvoiceModel');
const DeliveryChallanModel = require('../models/DeliveryChallanModel');
const LedgerEntryModel = require('../models/LedgerEntryModel');

/**
 * Temp controller function to wipe collections and insert structured test data
 */

exports.seedDatabase = async (req, res) => {
  try {
    console.log('🔄 Initiating FormulaFlow database seeding routine...');

    // 1. Clear existing data to ensure no duplicate keys (e.g., SKU/Unique indices)
    await Promise.all([
      ItemModel.deleteMany({}),
      MarketCostModel.deleteMany({}),
      FormulaModel.deleteMany({}),
      BatchModel.deleteMany({}),
      PartyModel.deleteMany({}),
      InvoiceModel.deleteMany({}),
      DeliveryChallanModel.deleteMany({}),
      LedgerEntryModel.deleteMany({})
    ]);

    console.log('🧹 Existing data cleared out.');

    // 2. Populate Inventory Items (Raw Materials & Finished Goods)
    const rawResin = await ItemModel.create({
      name: 'Resin Alpha Base',
      sku: 'RM-RES-01',
      type: 'Raw Material',
      stockQty: 5000.00,
      unitOfMeasure: 'kg'
    });

    const rawPigment = await ItemModel.create({
      name: 'Pigment Red 3B',
      sku: 'RM-PIG-05',
      type: 'Raw Material',
      stockQty: 800.00,
      unitOfMeasure: 'kg'
    });

    const rawSolvent = await ItemModel.create({
      name: 'Solvent X-90',
      sku: 'RM-SOL-12',
      type: 'Raw Material',
      stockQty: 2500.00,
      unitOfMeasure: 'L'
    });

    const finishedEpox = await ItemModel.create({
      name: 'Premium Epoxy Red Coating',
      sku: 'FG-EPX-RED',
      type: 'Finished Good',
      stockQty: 350.00, // Initial stock on hand
      unitOfMeasure: 'L'
    });

    console.log('📦 Inventory items created.');

    // 3. Populate Market Costs (Dynamic over-riding values for cost calculator)
    await MarketCostModel.create([
      { itemId: rawResin._id, marketPrice: 5.25 },
      { itemId: rawPigment._id, marketPrice: 12.00 },
      { itemId: rawSolvent._id, marketPrice: 2.10 },
      { itemId: finishedEpox._id, marketPrice: 18.50 }
    ]);

    console.log('💰 Dynamic market pricing rules seeded.');

    // 4. Create a baseline Manufacturing Formula (Using parts by weight total = 1438)
    const epoxyFormula = await FormulaModel.create({
      productName: 'Premium Epoxy Red',
      description: 'High-gloss industrial protective resin coating formula.',
      baseYield: 1000.00, // True yield output for baseline run
      instructions: '1. Charge Resin Base. 2. Heat to 80C. 3. Sift pigment smoothly under high-shear dispersion. 4. Thin down with solvent.',
      ingredients: [
        { itemId: rawResin._id, value: 862.80 },
        { itemId: rawPigment._id, value: 143.80 },
        { itemId: rawSolvent._id, value: 431.40 }
      ]
    });

    console.log('🧪 Chemical formula master matrix configured.');

    // 5. Populate Business Partners (Parties)
    const clientApex = await PartyModel.create({
      name: 'Apex Distributors Ltd',
      type: 'Customer',
      phone: '+922135551234',
      address: 'Plot 45-C, Korangi Industrial Area, Karachi',
      ntnNumber: '7492018-3' // Tax registered filer
    });

    const supplierAlpha = await PartyModel.create({
      name: 'Alpha Petrochemicals Inc',
      type: 'Supplier',
      phone: '+924236667890',
      address: 'Sunder Industrial Estate, Lahore',
      ntnNumber: '1122334-5'
    });

    console.log('👥 Business Profiles (Parties) added.');

    // 6. Create a Production Batch History Record
    const sampleBatch = await BatchModel.create({
      formulaId: epoxyFormula._id,
      finishedGoodId: finishedEpox._id,
      status: 'Completed',
      scalingMethodUsed: 'Total Desired Yield',
      estimatedYield: 1000.00,
      actualYield: 995.50, // Modified by user due to chemical process transfer losses
      batchInstructionsSnapshot: epoxyFormula.instructions,
      ingredientsUsed: [
        { itemId: rawResin._id, qtyUsed: 862.80 },
        { itemId: rawPigment._id, qtyUsed: 143.80 },
        { itemId: rawSolvent._id, qtyUsed: 431.40 }
      ]
    });

    console.log('🏭 Historical batch run registered.');

    // 7. Seed Sales Invoices

    // Invoice 1: Taxed invoice on Credit terms (Outstanding pending balance)
    const taxedInvoice = await InvoiceModel.create({
      partyId: clientApex._id,
      invoiceType: 'Taxed',
      paymentStatus: 'Pending',
      items: [
        { itemId: finishedEpox._id, qty: 100.00, unitPrice: 20.00 }
      ],
      totalAmount: 2000.00,
      taxAmount: 360.00, // 18% sales tax calculation applied
      grandTotal: 2360.00
    });

    // Write Sales Debt to Ledger
    await LedgerEntryModel.create({
      partyId: clientApex._id,
      entryType: 'Sale',
      referenceId: taxedInvoice._id,
      debit: 2360.00,
      credit: 0,
      description: 'Taxed sales invoice issued under terms - Pending'
    });

    // Invoice 2: Non-Taxed Sale (Cash sale context with immediate ledger settlement)
    const cashInvoice = await InvoiceModel.create({
      partyId: clientApex._id,
      invoiceType: 'Non-Taxed',
      paymentStatus: 'Paid',
      items: [
        { itemId: finishedEpox._id, qty: 50.00, unitPrice: 18.00 }
      ],
      totalAmount: 900.00,
      taxAmount: 0, // Enforced zero rule for non-taxed sales
      grandTotal: 900.00
    });

    // Double-entry ledger execution for immediate cash settlement
    await LedgerEntryModel.create([
      {
        partyId: clientApex._id,
        entryType: 'Sale',
        referenceId: cashInvoice._id,
        debit: 900.00,
        credit: 0,
        description: 'Non-taxed commercial sales itemized invoice run'
      },
      {
        partyId: clientApex._id,
        entryType: 'Payment_Received',
        referenceId: cashInvoice._id,
        debit: 0,
        credit: 900.00,
        description: 'Immediate cash payment execution on checkout counter'
      }
    ]);

    console.log('🧾 Taxed and non-taxed invoice ledgers written.');
    console.log(taxedInvoice._id);
    console.log(finishedEpox._id);
    // 8. Generate a Delivery Challan (Only allowed to attach to the Taxed invoice)
    await DeliveryChallanModel.create({
      invoiceId: taxedInvoice._id,
      challanNumber: 'DC-2026-0001',
      status: 'Dispatched',
      itemsDispatched: [
        { itemId: finishedEpox._id, qtyDispatched: 100.00 }
      ]
    });

    console.log('🚚 Shipping Logistics (Delivery Challans) mounted.');

    // 9. Add a historical Purchase transaction with a Supplier (We owe them money)
    const rawMaterialPurchaseRef = new mongoose.Types.ObjectId();
    await LedgerEntryModel.create({
      partyId: supplierAlpha._id,
      entryType: 'Purchase',
      referenceId: rawMaterialPurchaseRef,
      debit: 0,
      credit: 4500.00, // Credit balance tracking we owe them
      description: 'Bulk raw material tank load chemical procurement allocation'
    });

    console.log('🎉 Seeding successfully executed.');
    
    return res.status(201).json({
      success: true,
      message: 'FormulaFlow database seed operation completed cleanly.'
    });

  } catch (error) {
    console.error('❌ Critical seeder compilation execution crash:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete database seeding sequence.',
      error: error.message
    });
  }
};

