const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const { aiLimiter }              = require('../middleware/rateLimiter');
const ctrl = require('../controllers/demandController');

router.use(protect, requireSubscription);

router.get('/stats',           ctrl.getStats);
router.get('/',                ctrl.getPredictions);
router.get('/accuracy',        ctrl.getAccuracyHistory);
router.post('/generate',       notPharmacist, aiLimiter, ctrl.generatePredictions);
router.post('/update-actuals', notPharmacist, ctrl.updateActual);
router.post('/create-po',      notPharmacist, ctrl.createPO);

module.exports = router;