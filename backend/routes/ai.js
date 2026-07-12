const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/aiController');

// Public — no auth needed (just returns static model list)
router.get('/models', ctrl.getModels);

router.use(protect);
router.use(requireSubscription);

// router.get('/models',                  ctrl.getModels);
router.post('/ask',                    ctrl.askAssistant);
router.post('/suggest-medicine',       ctrl.suggestMedicineDetails);
router.post('/check-interactions',     ctrl.checkInteractions);
router.get('/reorder-suggestions',     ctrl.getReorderSuggestions);

module.exports = router;