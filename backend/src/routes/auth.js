// ── routes/auth.js ────────────────────────────────────────────────
const express = require('express');
const multer  = require('multer');
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload  = multer({ storage: multer.memoryStorage() });

const router = express.Router();
router.post('/register',  ctrl.register);
router.post('/login',     ctrl.login);
router.get ('/me',        protect, ctrl.getMe);
router.post('/kyc',       protect, upload.fields([{name:'collegeId'},{name:'aadhaar'},{name:'selfie'}]), ctrl.submitKyc);
router.post('/switch-role', protect, ctrl.switchRole);
module.exports = router;
