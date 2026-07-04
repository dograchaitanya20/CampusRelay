const express = require('express');
const ctrl    = require('../controllers/deliveryController');
const { protect, requireApproved } = require('../middleware/auth');

const router = express.Router();
const auth   = [protect, requireApproved];

router.get ('/',                      protect, ctrl.getFeed);
router.post('/',                      ...auth,  ctrl.create);
router.get ('/my',                    ...auth,  ctrl.getMyDeliveries);
router.get ('/:id',                   protect, ctrl.getOne);
router.post('/:id/accept',            ...auth,  ctrl.accept);
router.post('/:id/verify-pickup',     ...auth,  ctrl.verifyPickup);
router.post('/:id/confirm-delivery',  ...auth,  ctrl.confirmDelivery);
router.post('/:id/cancel',            ...auth,  ctrl.cancel);
router.post('/:id/dispute',           ...auth,  ctrl.dispute);
router.post('/:id/refresh-otp', ...auth, ctrl.refreshOtp);
router.patch('/:id/location',         ...auth,  ctrl.updateLocation);
router.get('/:id/otps', ...auth, ctrl.getOtps);

module.exports = router;
 