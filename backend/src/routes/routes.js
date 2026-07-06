// ── routes.js (complete fixed version) ───────────────────────────
const express  = require('express');
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const mongoose = require('mongoose');

const User         = require('../models/User');
const { Transaction, Message } = require('../models/Transaction');
const Delivery     = require('../models/Delivery');
const { protect, requireApproved, adminOnly } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────
// WALLET ROUTER
// ─────────────────────────────────────────────────────────────────
const walletRouter = express.Router();
walletRouter.use(protect, requireApproved);

walletRouter.get('/balance', async (req, res) => {
  res.json({ success: true, wallet: req.user.wallet });
});

walletRouter.get('/transactions', async (req, res) => {
  try {
    const txns = await Transaction.find({ user: req.user._id })
      .populate('delivery', 'deliveryCode package.app')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, transactions: txns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

walletRouter.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt < 30)
      return res.status(400).json({ success: false, message: 'Minimum top-up is ₹30' });
    console.log('Razorpay Key ID:', process.env.RAZORPAY_KEY_ID); 
    if (amt > 10000)
      return res.status(400).json({ success: false, message: 'Maximum top-up is ₹10,000' });

    const rzp = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await rzp.orders.create({
      amount:   amt * 100,
      currency: 'INR',
      receipt:  `topup_${req.user._id}_${Date.now()}`,
    });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

walletRouter.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    // Verify signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });

    // Idempotency: check if this payment was already processed
    const existing = await Transaction.findOne({ 'razorpay.paymentId': razorpay_payment_id });
    if (existing)
      return res.status(409).json({ success: false, message: 'Payment already processed' });

    const amt    = parseInt(amount);
    const before = req.user.wallet.balance;

    req.user.wallet.balance += amt;
    await req.user.save();

    await Transaction.create({
      user:      req.user._id,
      type:      'topup',
      amount:    amt,
      direction: 'credit',
      balanceBefore: before,
      balanceAfter:  req.user.wallet.balance,
      razorpay: {
        orderId:   razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
      note: 'Wallet top-up via Razorpay',
    });

    res.json({ success: true, balance: req.user.wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DEV ONLY — instant wallet credit
walletRouter.post('/dev-credit', async (req, res) => {
  if (process.env.NODE_ENV !== 'development')
    return res.status(403).json({ success: false, message: 'Dev only' });

  const amt = parseInt(req.body.amount) || 500;
  if (amt < 1 || amt > 50000)
    return res.status(400).json({ success: false, message: 'Amount out of range' });

  const before = req.user.wallet.balance;
  req.user.wallet.balance += amt;
  await req.user.save();

  await Transaction.create({
    user:      req.user._id,
    type:      'topup',
    amount:    amt,
    direction: 'credit',
    balanceBefore: before,
    balanceAfter:  req.user.wallet.balance,
    note: `Dev credit — ₹${amt}`,
  });

  res.json({ success: true, balance: req.user.wallet.balance, message: `₹${amt} added (dev mode)` });
});

walletRouter.post('/withdraw', async (req, res) => {
  try {
    const amt = parseInt(req.body.amount);
    if (!amt || amt < 50)
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₹50' });
    if (amt > req.user.wallet.balance)
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    if (!req.user.upiId)
      return res.status(400).json({ success: false, message: 'Add a UPI ID in your profile first' });
    if (!req.user.roles.includes('carrier'))
      return res.status(403).json({ success: false, message: 'Only carriers can withdraw' });

    const before = req.user.wallet.balance;
    req.user.wallet.balance -= amt;
    await req.user.save();

    await Transaction.create({
      user:      req.user._id,
      type:      'withdrawal',
      amount:    amt,
      direction: 'debit',
      balanceBefore: before,
      balanceAfter:  req.user.wallet.balance,
      note: `Withdrawal to UPI: ${req.user.upiId}`,
    });

    res.json({ success: true, balance: req.user.wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// RATINGS ROUTER  ← fixed 500 error
// ─────────────────────────────────────────────────────────────────
const ratingsRouter = express.Router();
ratingsRouter.use(protect, requireApproved);

ratingsRouter.post('/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    // FIX 1: Validate ObjectId before hitting DB — this was the 500 cause
    if (!mongoose.Types.ObjectId.isValid(deliveryId))
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });

    const { stars, tags, comment } = req.body;

    // FIX 2: Validate stars before any DB call
    const starsNum = parseInt(stars);
    if (!starsNum || starsNum < 1 || starsNum > 5)
      return res.status(400).json({ success: false, message: 'Stars must be 1–5' });

    const del = await Delivery.findById(deliveryId);

    if (!del)
      return res.status(404).json({ success: false, message: 'Delivery not found' });

    if (del.status !== 'delivered')
      return res.status(400).json({ success: false, message: 'Can only rate delivered orders' });

    // FIX 3: Ensure carrier exists on delivery before .toString()
    if (!del.carrier)
      return res.status(400).json({ success: false, message: 'No carrier assigned to this delivery' });

    const uid        = req.user._id.toString();
    const isReceiver = del.receiver.toString() === uid;
    const isCarrier  = del.carrier.toString()  === uid;

    if (!isReceiver && !isCarrier)
      return res.status(403).json({ success: false, message: 'Not your delivery' });

    // FIX 4: Safely initialise del.ratings if undefined
    if (!del.ratings) del.ratings = {};

    const payload = {
      stars:     starsNum,
      tags:      Array.isArray(tags) ? tags.slice(0, 5) : [],
      comment:   comment ? String(comment).trim().slice(0, 500) : '',
      createdAt: new Date(),
    };

    if (isReceiver) {
      if (del.ratings.byReceiver?.stars)
        return res.status(400).json({ success: false, message: 'You already rated this delivery' });

      del.ratings.byReceiver = payload;

      // FIX 5: Guard against carrier user not found
      const carrier = await User.findById(del.carrier);
      if (!carrier)
        return res.status(404).json({ success: false, message: 'Carrier user not found' });

      carrier.addRating(starsNum);
      await carrier.save();

    } else {
      if (del.ratings.byCarrier?.stars)
        return res.status(400).json({ success: false, message: 'You already rated this delivery' });

      del.ratings.byCarrier = payload;

      const receiver = await User.findById(del.receiver);
      if (!receiver)
        return res.status(404).json({ success: false, message: 'Receiver user not found' });

      receiver.addRating(starsNum);
      await receiver.save();
    }

    // FIX 6: markModified so Mongoose detects the nested change
    del.markModified('ratings');
    await del.save();

    res.json({ success: true, message: 'Rating submitted!' });
  } catch (err) {
    console.error('Ratings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET rating for a delivery (so frontend can show existing rating)
ratingsRouter.get('/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deliveryId))
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });

    const del = await Delivery.findById(deliveryId).select('ratings receiver carrier status');
    if (!del)
      return res.status(404).json({ success: false, message: 'Delivery not found' });

    const uid = req.user._id.toString();
    const isReceiver = del.receiver?.toString() === uid;
    const isCarrier  = del.carrier?.toString()  === uid;

    if (!isReceiver && !isCarrier && !req.user.roles.includes('admin'))
      return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({
      success: true,
      ratings:         del.ratings || {},
      myRating:        isReceiver ? del.ratings?.byReceiver : del.ratings?.byCarrier,
      hasRated:        isReceiver ? !!del.ratings?.byReceiver?.stars : !!del.ratings?.byCarrier?.stars,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// CHAT ROUTER
// ─────────────────────────────────────────────────────────────────
const chatRouter = express.Router();
chatRouter.use(protect);

chatRouter.get('/:deliveryId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.deliveryId))
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });

    const msgs = await Message.find({ delivery: req.params.deliveryId })
      .populate('sender', 'fullName activeRole')
      .sort({ createdAt: 1 });
    res.json({ success: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

chatRouter.post('/:deliveryId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.deliveryId))
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });

    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });

    const del = await Delivery.findById(req.params.deliveryId);
    if (!del)
      return res.status(404).json({ success: false, message: 'Delivery not found' });

    // Only participants can chat
    const uid = req.user._id.toString();
    const ok  = del.receiver?.toString() === uid || del.carrier?.toString() === uid;
    if (!ok)
      return res.status(403).json({ success: false, message: 'Not your delivery' });

    const msg = await Message.create({
      delivery: del._id,
      sender:   req.user._id,
      content:  content.trim().slice(0, 1000),
    });
    await msg.populate('sender', 'fullName activeRole');

    req.io.to(`delivery_${del._id}`).emit('new_message', {
      deliveryId: del._id.toString(),   // always a plain string — prevents ObjectId vs string mismatch on client
      message:    msg,
    });

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// ADMIN ROUTER
// ─────────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(protect, adminOnly);

adminRouter.get('/stats', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);

    const [users, carriers, todayD, monthD, disputes, pendingKyc, revenue] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ roles: 'carrier', isActive: true }),
      Delivery.countDocuments({ status: 'delivered', deliveredAt: { $gte: today } }),
      Delivery.countDocuments({ status: 'delivered', deliveredAt: { $gte: month } }),
      Delivery.countDocuments({ status: 'disputed' }),
      User.countDocuments({ 'kyc.status': { $in: ['pending', 'ai_verified'] } }),
      Transaction.aggregate([
        { $match: { type: 'commission_earn', createdAt: { $gte: month } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const topCarriers = await Delivery.aggregate([
      { $match: { status: 'delivered', deliveredAt: { $gte: month } } },
      { $group: { _id: '$carrier', count: { $sum: 1 }, earned: { $sum: '$commission.paid' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.fullName', count: 1, earned: 1, rating: '$user.rating.average' } },
    ]);

    res.json({
      success: true,
      stats: { users, carriers, todayD, monthD, disputes, pendingKyc, revenue: revenue[0]?.total || 0, topCarriers },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.get('/kyc', async (req, res) => {
  try {
    const users = await User.find({ 'kyc.status': { $in: ['pending', 'ai_verified'] } })
      .select('fullName phone college kyc createdAt')
      .sort({ 'kyc.submittedAt': 1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.patch('/kyc/:userId/approve', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId))
      return res.status(400).json({ success: false, message: 'Invalid user ID' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.kyc.status      = 'approved';
    user.kyc.reviewedAt  = new Date();
    user.kyc.reviewedBy  = req.user._id;
    user.isActive        = true;
    await user.save();

    res.json({ success: true, message: `${user.fullName} approved` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.patch('/kyc/:userId/reject', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId))
      return res.status(400).json({ success: false, message: 'Invalid user ID' });

    const { reason } = req.body;
    if (!reason?.trim())
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.kyc.status          = 'rejected';
    user.kyc.rejectionReason = reason.trim();
    user.kyc.reviewedAt      = new Date();
    user.kyc.reviewedBy      = req.user._id;
    await user.save();

    res.json({ success: true, message: `${user.fullName} rejected` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const filter = {};
    if (role)   filter.roles  = role;
    if (search) filter.$or    = [
      { fullName: { $regex: search, $options: 'i' } },
      { phone:    { $regex: search } },
    ];

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('fullName phone college roles rating stats wallet isActive isBanned createdAt kyc')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.patch('/users/:userId/ban', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim())
      return res.status(400).json({ success: false, message: 'Ban reason is required' });
    if (!mongoose.Types.ObjectId.isValid(req.params.userId))
      return res.status(400).json({ success: false, message: 'Invalid user ID' });

    await User.findByIdAndUpdate(req.params.userId, {
      isBanned:  true,
      banReason: reason.trim(),
      isActive:  false,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.patch('/users/:userId/unban', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId))
      return res.status(400).json({ success: false, message: 'Invalid user ID' });

    await User.findByIdAndUpdate(req.params.userId, {
      isBanned:  false,
      banReason: undefined,
      isActive:  true,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.get('/disputes', async (req, res) => {
  try {
    const disputes = await Delivery.find({ status: 'disputed' })
      .populate('receiver', 'fullName phone')
      .populate('carrier',  'fullName phone')
      .populate('dispute.raisedBy', 'fullName')
      .sort({ updatedAt: -1 });
    res.json({ success: true, disputes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.patch('/disputes/:deliveryId/resolve', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.deliveryId))
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });

    const { favouring, resolution } = req.body;
    if (!['receiver', 'carrier'].includes(favouring))
      return res.status(400).json({ success: false, message: 'favouring must be "receiver" or "carrier"' });

    const del = await Delivery.findById(req.params.deliveryId);
    if (!del) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (del.status !== 'disputed')
      return res.status(400).json({ success: false, message: 'Delivery is not disputed' });

    const platCut = parseInt(process.env.PLATFORM_CUT) || 7;
    const total   = del.commission.current + platCut;

    if (favouring === 'receiver') {
      // Refund to receiver
      const r = await User.findById(del.receiver);
      r.wallet.escrow  -= total;
      r.wallet.balance += total;
      await r.save();
      await Transaction.create({
        user: r._id, delivery: del._id, type: 'escrow_refund',
        amount: total, direction: 'credit', note: 'Dispute resolved in receiver\'s favour',
      });
      del.status = 'cancelled';
    } else {
      // Pay carrier
      const c = await User.findById(del.carrier);
      c.wallet.balance     += del.commission.current;
      c.wallet.totalEarned += del.commission.current;
      await c.save();
      const r = await User.findById(del.receiver);
      r.wallet.escrow -= total;
      await r.save();
      await Transaction.create({
        user: c._id, delivery: del._id, type: 'commission_earn',
        amount: del.commission.current, direction: 'credit', note: 'Dispute resolved in carrier\'s favour',
      });
      del.status = 'delivered';
    }

    del.dispute.status     = 'resolved';
    del.dispute.resolution = resolution;
    del.dispute.resolvedBy = req.user._id;
    del.dispute.resolvedAt = new Date();
    await del.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// USERS ROUTER
// ─────────────────────────────────────────────────────────────────
const usersRouter = express.Router();
usersRouter.use(protect);

usersRouter.patch('/profile', async (req, res) => {
  try {
    const allowed = ['fullName', 'email', 'upiId', 'college'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    // Validate UPI ID format if provided
    if (updates.upiId && !/^[\w.\-]{3,}@[a-zA-Z]{3,}$/.test(updates.upiId))
      return res.status(400).json({ success: false, message: 'Invalid UPI ID format (e.g. name@upi)' });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

usersRouter.patch('/online-status', async (req, res) => {
  try {
    req.user.isOnline = Boolean(req.body.isOnline);
    await req.user.save();
    req.io.emit('carrier_status', { carrierId: req.user._id, isOnline: req.user.isOnline });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

usersRouter.get('/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId))
      return res.status(400).json({ success: false, message: 'Invalid user ID' });

    const user = await User.findById(req.params.userId)
      .select('fullName college roles rating stats isOnline');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { walletRouter, ratingsRouter, chatRouter, adminRouter, usersRouter };