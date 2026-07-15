const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/otController');

router.use(protect, requireSubscription);

router.get('/',              ctrl.getAll);
router.get('/stats',         ctrl.getStats);
router.get('/report',        ctrl.getReport);
router.get('/availability',  ctrl.getAvailability);
router.get('/:id',           ctrl.getOne);

router.post('/',             notPharmacist, ctrl.create);
router.put('/:id',           notPharmacist, ctrl.update);
router.delete('/:id',        notPharmacist, ctrl.remove);

router.patch('/:id/status',                    ctrl.updateStatus);
router.patch('/:id/checklist/:itemId',         ctrl.updateChecklist);
router.post('/:id/team',     notPharmacist,    ctrl.addTeamMember);
router.delete('/:id/team/:memberId', notPharmacist, ctrl.removeTeamMember);

module.exports = router;