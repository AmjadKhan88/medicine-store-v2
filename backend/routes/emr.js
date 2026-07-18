const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/emrController');

router.use(protect, requireSubscription);

router.get('/:patientId',               ctrl.getEMR);
router.put('/:patientId',               ctrl.updateEMR);
router.get('/:patientId/timeline',      ctrl.getTimeline);
router.get('/:patientId/full',          ctrl.getFullRecord);

router.post('/:patientId/problems',                    notPharmacist, ctrl.addProblem);
router.put('/:patientId/problems/:problemId',          notPharmacist, ctrl.updateProblem);
router.delete('/:patientId/problems/:problemId',       notPharmacist, ctrl.removeProblem);

module.exports = router;