const express = require('express');
const router = express.Router();
const PartyController = require('../controllers/partyController');
const {seedDatabase} = require('../controllers/seeder');
const mongoose = require('mongoose');

// Helper wrapper to safely load models with the Model suffix
const PartyModel = mongoose.model('PartyModel');

router.get('/seed-5', seedDatabase);
router.post('/new-party', PartyController.newParty);
router.get('/', PartyController.getAllParties);

/**
 * @route   GET /api/ledger/balances
 * @desc    Get all parties with an outstanding pending balance (Customers or Suppliers)
 * @access  Protected/Private
 */
router.get('/balances', async (req, res) => {
  try {
    // Default to 'Customer' if no type query parameter is provided
    const { type } = req.query;
    
    // Strict validation to avoid unauthorized array filtering injections
    const validTypes = ['Customer', 'Supplier'];
    const typeFilter = validTypes.includes(type) ? type : 'Customer';

    const outstandingBalances = await PartyModel.aggregate([
      // 1. Filter by requested party type
      { $match: { type: typeFilter } },
      
      // 2. Pull all related ledger records
      {
        $lookup: {
          from: 'ledgerentrymodels',
          localField: '_id',
          foreignField: 'partyId',
          as: 'ledgerEntries'
        }
      },
      
      // 3. Project profiles and isolate balance configurations contextually
      {
        $project: {
          name: 1,
          type: 1,
          ntnNumber: 1,
          outstandingBalance: {
            $let: {
              vars: {
                totalDebit: { $sum: '$ledgerEntries.debit' },
                totalCredit: { $sum: '$ledgerEntries.credit' }
              },
              in: {
                $cond: {
                  if: { $eq: ['$type', 'Customer'] },
                  then: { $subtract: ['$$totalDebit', '$$totalCredit'] },
                  else: { $subtract: ['$$totalCredit', '$$totalDebit'] }
                }
              }
            }
          }
        }
      },
      
      // 4. Return items with remaining un-cleared metrics
      { $match: { outstandingBalance: { $gt: 0 } } },
      
      // 5. Sort by heaviest liability prioritization
      { $sort: { outstandingBalance: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      count: outstandingBalances.length,
      data: outstandingBalances
    });

  } catch (error) {
    console.error('Error fetching outstanding balances:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error tracking live ledger statement calculations.'
    });
  }
});

/**
 * @route   GET /api/ledger/balances/:partyId
 * @desc    Get real-time profile statement and total summary ledger trace for a single party
 * @access  Protected/Private
 */
router.get('/balances/:partyId', async (req, res) => {
  try {
    const { partyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({ success: false, message: 'Invalid Party ID framework identifier.' });
    }

    const partyRecord = await PartyModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(partyId) } },
      {
        $lookup: {
          from: 'ledgerentrymodels',
          localField: '_id',
          foreignField: 'partyId',
          as: 'ledgerEntries'
        }
      },
      {
        $project: {
          name: 1,
          type: 1,
          ntnNumber: 1,
          phone: 1,
          address: 1,
          outstandingBalance: {
            $let: {
              vars: {
                totalDebit: { $sum: '$ledgerEntries.debit' },
                totalCredit: { $sum: '$ledgerEntries.credit' }
              },
              in: {
                $cond: {
                  if: { $eq: ['$type', 'Customer'] },
                  then: { $subtract: ['$$totalDebit', '$$totalCredit'] },
                  else: { $subtract: ['$$totalCredit', '$$totalDebit'] }
                }
              }
            }
          }
        }
      }
    ]);

    if (!partyRecord.length) {
      return res.status(404).json({ success: false, message: 'Requested profile details not found.' });
    }

    return res.status(200).json({
      success: true,
      data: partyRecord[0]
    });

  } catch (error) {
    console.error('Error fetching single party trace summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compile unique live ledger calculations data link.'
    });
  }
});



module.exports = router;