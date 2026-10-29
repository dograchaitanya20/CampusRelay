const jwt           = require('jsonwebtoken');
const User          = require('../models/User');
// const { runKYCVerification } = require('../utils/rekognition');
const { runKYCVerification } = require('../utils/rekognition');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.register = async (req, res) => {
  try {
    const { fullName, phone, password, roles, college, upiId, email } = req.body;
    if (!fullName || !phone || !password)
      return res.status(400).json({ success: false, message: 'Name, phone and password are required' });
    if (phone.length !== 10 || !/^\d+$/.test(phone))
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit phone number' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    if (await User.findOne({ phone }))
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    const user = await User.create({
      fullName, phone, email, passwordHash: password,
      roles:      roles || ['receiver'],
      activeRole: roles?.includes('carrier') && !roles?.includes('receiver') ? 'carrier' : 'receiver',
      college, upiId,
    });
    res.status(201).json({ success: true, token: sign(user._id), user: user.toPublicJSON() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    const user = await User.findOne({ phone });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    if (user.isBanned)
      return res.status(403).json({ success: false, message: `Account suspended: ${user.banReason || 'Contact support'}` });
    user.stats.lastActive = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, token: sign(user._id), user: user.toPublicJSON() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
};

exports.submitKyc = async (req, res) => {
  try {
    const user  = req.user;
    const files = req.files || {};
    const isDev = process.env.NODE_ENV === 'development';

    if (!files.collegeId || !files.selfie)
      return res.status(400).json({ success: false, message: 'College ID and selfie are required' });

    // ── Upload to Cloudinary ──────────────────────────────────────────────
    let collegeIdUrl = user.kyc?.collegeIdUrl;
    let aadhaarUrl   = user.kyc?.aadhaarUrl;
    let selfieUrl    = user.kyc?.selfieUrl;

    if (isDev) {
      collegeIdUrl = `dev://college_id_${user._id}`;
      aadhaarUrl   = files.aadhaar ? `dev://aadhaar_${user._id}` : aadhaarUrl;
      selfieUrl    = `dev://selfie_${user._id}`;
    } else {
      const cloudinary = require('cloudinary').v2;
            cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const uploadBuf  = (buf, folder) => new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image', quality: 'auto' },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        ).end(buf);
      });
      collegeIdUrl = await uploadBuf(files.collegeId[0].buffer, `kyc/${user._id}/college_id`);
      selfieUrl    = await uploadBuf(files.selfie[0].buffer,    `kyc/${user._id}/selfie`);
      if (files.aadhaar)
        aadhaarUrl = await uploadBuf(files.aadhaar[0].buffer,   `kyc/${user._id}/aadhaar`);
    }

    // ── AWS Rekognition KYC (production only) ─────────────────────────────
    let faceMatchScore  = 92;
    let faceMatchPassed = true;
    let kycStatus       = 'ai_verified';
    let rejectionReason = null;
    let autoApproved    = false;

    if (!isDev) {
      const kycResult = await runKYCVerification(
        files.selfie[0].buffer,
        files.collegeId[0].buffer,
        user._id
      );
      faceMatchScore  = kycResult.confidence;
      faceMatchPassed = kycResult.approved;

      if (kycResult.approved) {
        kycStatus    = 'approved';
        autoApproved = true;
      } else {
        kycStatus       = 'rejected';
        rejectionReason = kycResult.reason;
      }
    }

    // ── Save to MongoDB ───────────────────────────────────────────────────
    user.kyc = {
      ...user.kyc,
      collegeIdUrl, aadhaarUrl, selfieUrl,
      faceMatchScore, faceMatchPassed,
      status:          kycStatus,
      rejectionReason: rejectionReason || undefined,
      submittedAt:     new Date(),
      reviewedAt:      autoApproved ? new Date() : undefined,
    };
    if (autoApproved) user.isActive = true;
    await user.save();

    // ── Socket notify on auto-approve ─────────────────────────────────────
    if (autoApproved && req.io) {
      req.io.to(`user_${user._id}`).emit('kyc_approved', {
        message: '🎉 Identity verified! Your account is now active.',
      });
    }

    // ── Rejection response ────────────────────────────────────────────────
    if (kycStatus === 'rejected') {
      return res.status(400).json({
        success: false, faceMatchScore, faceMatchPassed: false,
        message: rejectionReason, retryAllowed: true,
      });
    }

    res.json({
      success: true, faceMatchScore, faceMatchPassed, autoApproved,
      message: autoApproved
        ? '✅ Identity verified! Account is now active.'
        : isDev
          ? 'KYC submitted (dev mode). Awaiting admin approval.'
          : 'Documents verified by AI. Awaiting final admin approval.',
    });
  } catch (err) {
    console.error('KYC error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!req.user.roles.includes(role))
      return res.status(400).json({ success: false, message: `You don't have the ${role} role` });
    req.user.activeRole = role;
    await req.user.save();
    res.json({ success: true, activeRole: role });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
