const Party = require('../models/PartyModel');
const mongoose = require('mongoose');

exports.getAllParties = async (req, res) => {
    try {
        const PartiesFromDb = await Party.find();
        const PartyList = PartiesFromDb.map(f => ({
            id: f._id,
            name: f.name,
            type: f.type,
            phone: f.phone,
            address: f.address,
            ntnNumber: f.ntnNumber,
            
        }));
        res.json(PartyList);
    } catch (error) {
        console.error("Failed to fetch formulas:", error);
        res.status(500).json({ error: "Failed to retrieve formulas from the database" });
    }
};

exports.newParty = async (req, res) => {
    const { name, type, phone, address, description, ntnNumber } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: "Name and party type is required" });
    }

    try {
        const newParty = new Party({ name, type, phone, address, description, ntnNumber  });
        await newParty.save(); 
        res.status(201).json({ message: "Party info saved to database!", party: newParty });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

async function getPartyWithBalance(partyId) {
  const PartyModel = mongoose.model('PartyModel');
  
  const result = await PartyModel.aggregate([
    // 1. Find the specific party
    { $match: { _id: new mongoose.Types.ObjectId(partyId) } },
    
    // 2. Lookup all matching ledger entries
    {
      $lookup: {
        from: 'ledgerentrymodels', // MongoDB collection names are lowercase pluras by default
        localField: '_id',
        foreignField: 'partyId',
        as: 'ledgerEntries'
      }
    },
    
    // 3. Project the profile data and calculate net balance live
    {
      $project: {
        name: 1,
        type: 1,
        ntnNumber: 1,
        phone: 1,
        currentBalance: {
          $reduce: {
            input: '$ledgerEntries',
            initialValue: 0,
            in: { $add: ['$$value', { $subtract: ['$$this.debit', '$$this.credit'] }] }
          }
        }
      }
    }
  ]);

  return result[0] || null;
}

async function getAllPendingBalances(typeFilter = 'Customer') {
  const PartyModel = mongoose.model('PartyModel');

  return await PartyModel.aggregate([
    // 1. Filter by requested party type ('Customer' or 'Supplier')
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
    
    // 3. Project profile data and calculate net balance based on their role
    {
      $project: {
        name: 1,
        type: 1,
        ntnNumber: 1,
        outstandingBalance: {
          $let: {
            vars: {
              // Pre-calculate raw sums from the array
              totalDebit: { $sum: '$ledgerEntries.debit' },
              totalCredit: { $sum: '$ledgerEntries.credit' }
            },
            in: {
              $cond: {
                // If it's a customer, Balance = Debits - Credits (What they owe us)
                if: { $eq: ['$type', 'Customer'] },
                then: { $subtract: ['$$totalDebit', '$$totalCredit'] },
                // If it's a supplier, Balance = Credits - Debits (What we owe them)
                else: { $subtract: ['$$totalCredit', '$$totalDebit'] }
              }
            }
          }
        }
      }
    },
    
    // 4. Only return parties with a remaining active balance
    { $match: { outstandingBalance: { $gt: 0 } } },
    
    // 5. Sort by largest outstanding amount first
    { $sort: { outstandingBalance: -1 } }
  ]);
}