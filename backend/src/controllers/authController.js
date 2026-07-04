const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.register = async (req, res) => {
  try {
    const { fullName, phone, password, roles, college, upiId, email } = req.body;
    if (await User.findOne({ phone }))
      return res.status(400).json({ success: false, message: 'Phone already registered' });
    const user = await User.create({
      fullName, phone, email, passwordHash: password,
      roles: roles || ['receiver'],
      activeRole: roles?.includes('carrier') && !roles?.includes('receiver') ? 'carrier' : 'receiver',
      college, upiId,
    });
    res.status(201).json({ success: true, token: sign(user._id), user: user.toPublicJSON() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.isBanned)
      return res.status(403).json({ success: false, message: 'Account banned' });
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
    const user = req.user;
    const files = req.files || {};

    let collegeIdUrl, aadhaarUrl, selfieUrl;

    // In dev mode, just store placeholder URLs
    if (process.env.NODE_ENV === 'development') {
      collegeIdUrl = files.collegeId ? `dev://college_id_${user._id}` : user.kyc?.collegeIdUrl;
      aadhaarUrl   = files.aadhaar   ? `dev://aadhaar_${user._id}`   : user.kyc?.aadhaarUrl;
      selfieUrl    = files.selfie    ? `dev://selfie_${user._id}`    : user.kyc?.selfieUrl;
    } else {
      const cloudinary = require('cloudinary').v2;
      const uploadBuf  = (buf, folder) => new Promise((res, rej) => {
        cloudinary.uploader.upload_stream({ folder }, (e, r) => e ? rej(e) : res(r.secure_url))
          .end(buf);
      });
      if (files.collegeId) collegeIdUrl = await uploadBuf(files.collegeId[0].buffer, `kyc/${user._id}/college`);
      if (files.aadhaar)   aadhaarUrl   = await uploadBuf(files.aadhaar[0].buffer,   `kyc/${user._id}/aadhaar`);
      if (files.selfie)    selfieUrl    = await uploadBuf(files.selfie[0].buffer,     `kyc/${user._id}/selfie`);
    }

    // Mock AI face match (replace with AWS Rekognition in prod)
    const faceMatchScore  = 92;
    const faceMatchPassed = faceMatchScore >= 80;

    user.kyc = {
      ...user.kyc,
      collegeIdUrl: collegeIdUrl || user.kyc?.collegeIdUrl,
      aadhaarUrl:   aadhaarUrl   || user.kyc?.aadhaarUrl,
      selfieUrl:    selfieUrl    || user.kyc?.selfieUrl,
      faceMatchScore, faceMatchPassed,
      status:      faceMatchPassed ? 'ai_verified' : 'pending',
      submittedAt: new Date(),
    };
    await user.save();

    res.json({ success: true, faceMatchScore, faceMatchPassed,
               message: 'KYC submitted. Awaiting admin approval.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
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
