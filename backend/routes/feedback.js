const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/feedbackController');

/* ── Public routes — no auth ── */
router.get('/form/:token',   ctrl.getPublicForm);
router.post('/submit/:token',ctrl.submit);

/* ── Auth routes ── */
router.use(protect, requireSubscription);

router.get('/',              ctrl.getAll);
router.get('/stats',         ctrl.getStats);
router.post('/generate',     ctrl.generateLink);
router.post('/:id/respond',  ctrl.respond);
router.patch('/:id/flag',    ctrl.flag);
router.delete('/:id',        notPharmacist, ctrl.remove);

module.exports = router;