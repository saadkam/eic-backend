const express = require('express');
const router = express.Router();
const formulaController = require('../controllers/formulaController');

router.get('/', formulaController.getAllFormulas);
router.post('/scale', formulaController.scaleFormula);
router.post('/', formulaController.createFormula);

module.exports = router;