const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.isBanned) return res.status(403).json({ success: false, message: 'Account suspended' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.requireApproved = (req, res, next) => {
  if (!req.user.isActive)
    return res.status(403).json({ success: false, message: 'Account pending admin approval' });
  next();
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.some(r => req.user.roles.includes(r)))
    return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};

exports.adminOnly = (req, res, next) => {
  if (!req.user.roles.includes('admin'))
    return res.status(403).json({ success: false, message: 'Admin only' });
  next();
};
