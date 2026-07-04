const bcrypt     = require('bcryptjs');
const Delivery   = require('../models/Delivery');
const User       = require('../models/User');
const { Transaction, Message } = require('../models/Transaction');

const genOtp = async () => {
  const plain = Math.floor(1000 + Math.random() * 9000).toString();
  const hash  = await bcrypt.hash(plain, 10);
  return { plain, hash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) };
};

const sysMsg = (deliveryId, content, event) =>
  Message.create({ delivery: deliveryId, type: 'system', content, systemEvent: event }).catch(() => {});

// GET /api/deliveries — pending feed for carriers
exports.getFeed = async (req, res) => {
  try {
    // Exclude deliveries posted by the requesting user (dual-role: receiver + carrier)
    const deliveries = await Delivery.find({ status: 'pending', receiver: { $ne: req.user._id } })
      .populate('receiver', 'fullName rating college')
      .sort({ 'commission.current': -1, createdAt: 1 })
      .limit(30);
    res.json({ success: true, deliveries });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/deliveries
exports.create = async (req, res) => {
  try {
    const { app, description, isFragile, windowFrom, windowTo, hostelBlock, roomNumber, landmark, commission } = req.body;
    const receiver = req.user;
    const comm      = Math.max(parseInt(commission) || 30, parseInt(process.env.MIN_COMMISSION) || 30);
    if (!app || !['zomato', 'blinkit', 'swiggy', 'amazon', 'flipkart', 'other'].includes(app)) {
  return res.status(400).json({
    success: false,
    message: 'Invalid delivery app'
  });
}

if (!description || description.trim().length < 3) {
  return res.status(400).json({
    success: false,
    message: 'Description is required'
  });
}

if (comm < 30 || comm > 500) {
  return res.status(400).json({
    success: false,
    message: 'Commission must be ₹30–₹500'
  });
}
    const platCut   = parseInt(process.env.PLATFORM_CUT) || 7;
    const total     = comm + platCut;

    if (receiver.wallet.balance < total)
      return res.status(400).json({ success: false, message: `Need ₹${total} in wallet (commission + ₹${platCut} fee)` });

    const [pickup, delivery] = await Promise.all([genOtp(), genOtp()]);

    // Lock funds
    const before = receiver.wallet.balance;
    receiver.wallet.balance -= total;
    receiver.wallet.escrow  += total;
    await receiver.save();

    await Transaction.create({
      user: receiver._id, type: 'escrow_lock', amount: total, direction: 'debit',
      balanceBefore: before, balanceAfter: receiver.wallet.balance,
      note: 'Funds locked for delivery',
    });

    const del = await Delivery.create({
      receiver: receiver._id,
      package: { app, description, isFragile: isFragile || false },
      window:  { from: new Date(windowFrom), to: new Date(windowTo) },
      destination: { hostelBlock, roomNumber, landmark },
      commission: { initial: comm, current: comm },
      otps: {
        pickup:   { hash: pickup.hash,   plain: pickup.plain,   expiresAt: pickup.expiresAt },
        delivery: { hash: delivery.hash, plain: delivery.plain, expiresAt: delivery.expiresAt },
      },
    });

    // Broadcast to all online carriers
    // NOTE: receiver._id is required so the frontend can filter out the poster's own delivery
    req.io.emit('new_delivery', {
      _id:          del._id,
      deliveryCode: del.deliveryCode,
      package:      del.package,
      commission:   del.commission,
      destination:  del.destination,
      window:       del.window,
      createdAt:    del.createdAt,
      receiver: { _id: receiver._id, fullName: receiver.fullName, rating: receiver.rating },
    });

    res.status(201).json({
      success:     true,
      delivery:    del,
      pickupOtp:   pickup.plain,
      deliveryOtp: delivery.plain,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/deliveries/:id/accept — FCFS atomic
exports.accept = async (req, res) => {
  try {
    const carrier = req.user;

    const existing = await Delivery.findOne({ _id: req.params.id, status: 'pending' });


    if (!existing)
      return res.status(409).json({ success: false, message: 'Sorry! Someone else just accepted this.' });

    if (existing.receiver.toString() === carrier._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot carry your own delivery' });

    const updated = await Delivery.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { carrier: carrier._id, status: 'accepted', acceptedAt: new Date() } },
      { new: true }
    ).populate('receiver', 'fullName phone rating fcmToken');

    if (!updated)
      return res.status(409).json({ success: false, message: 'Sorry! Someone else just accepted this.' });

    req.io.emit('delivery_accepted', {
      deliveryId: updated._id,
      carrier: { _id: carrier._id, fullName: carrier.fullName, rating: carrier.rating, phone: carrier.phone },
    });
    req.io.emit('delivery_taken', { deliveryId: updated._id });

    await sysMsg(updated._id, `${carrier.fullName} accepted your delivery!`, 'carrier_accepted');

    res.json({ success: true, delivery: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOtps = async (req, res) => {
  try {
    const del = await Delivery.findById(req.params.id);
    if (!del) return res.status(404).json({ success: false, message: 'Not found' });
    if (del.receiver.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your delivery' });
    res.json({
      success: true,
      pickupOtp:   del.otps.pickup.plain,
      deliveryOtp: del.otps.delivery.plain,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/deliveries/:id/verify-pickup
exports.verifyPickup = async (req, res) => {
  try {
    const { otp } = req.body;
    const delivery = await Delivery.findById(req.params.id).populate('receiver', 'fullName fcmToken');
    if (!delivery?.carrier?.equals(req.user._id))
      return res.status(403).json({ success: false, message: 'Not your delivery' });
    if (delivery.status !== 'accepted')
      return res.status(400).json({ success: false, message: 'Wrong status' });
    if (new Date() > delivery.otps.pickup.expiresAt)
      return res.status(400).json({ success: false, message: 'OTP expired' });

    const valid = await bcrypt.compare(otp, delivery.otps.pickup.hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Incorrect OTP' });

    delivery.status = 'pickup_verified';
    delivery.pickedUpAt = new Date();
    delivery.otps.pickup.verified = true;
    delivery.checkpoints.push({ name: 'parcel_picked_up', timestamp: new Date(), note: 'OTP verified at gate' });
    await delivery.save();

    req.io.to(`delivery_${delivery._id}`).emit('pickup_verified', { deliveryId: delivery._id });
    await sysMsg(delivery._id, 'Parcel picked up at main gate ✅', 'parcel_picked_up');

    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/deliveries/:id/confirm-delivery
exports.confirmDelivery = async (req, res) => {
  try {
    const { otp } = req.body;
    const delivery = await Delivery.findById(req.params.id)
      .populate('receiver', 'fullName wallet fcmToken')
      .populate('carrier',  'fullName wallet stats fcmToken');

    if (!delivery?.carrier?._id?.equals(req.user._id))
      return res.status(403).json({ success: false, message: 'Not your delivery' });
    if (!['pickup_verified','in_transit'].includes(delivery.status))
      return res.status(400).json({ success: false, message: 'Wrong status' });
    if (new Date() > delivery.otps.delivery.expiresAt)
      return res.status(400).json({ success: false, message: 'OTP expired' });

    const valid = await bcrypt.compare(otp, delivery.otps.delivery.hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Incorrect OTP' });

    const platCut = parseInt(process.env.PLATFORM_CUT) || 7;
    const comm    = delivery.commission.current;
    const total   = comm + platCut;

    // Settle payments
    const receiverUser = await User.findById(delivery.receiver._id);
    receiverUser.wallet.escrow     -= total;
    receiverUser.wallet.totalSpent += total;
    await receiverUser.save();

    const carrierUser = await User.findById(delivery.carrier._id);
    carrierUser.wallet.balance     += comm;
    carrierUser.wallet.totalEarned += comm;
    carrierUser.stats.deliveriesAsCarrier++;
    carrierUser.stats.streak++;
    await carrierUser.save();

    await User.findByIdAndUpdate(delivery.receiver._id, { $inc: { 'stats.deliveriesAsReceiver': 1 } });

    await Transaction.insertMany([
      { user: receiverUser._id, delivery: delivery._id, type: 'escrow_release', amount: total, direction: 'debit', note: 'Escrow released on delivery' },
      { user: carrierUser._id,  delivery: delivery._id, type: 'commission_earn', amount: comm, direction: 'credit',
        balanceBefore: carrierUser.wallet.balance - comm, balanceAfter: carrierUser.wallet.balance,
        note: `Commission for ${delivery.deliveryCode}` },
    ]);

    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    delivery.otps.delivery.verified = true;
    delivery.commission.paid = comm;
    delivery.checkpoints.push({ name: 'delivered', timestamp: new Date(), note: 'Delivery OTP verified' });
    await delivery.save();

    req.io.to(`delivery_${delivery._id}`).emit('delivery_completed', { deliveryId: delivery._id, commissionPaid: comm });
    await sysMsg(delivery._id, `Delivered! ₹${comm} sent to carrier 🎉`, 'delivered');

    res.json({ success: true, commissionPaid: comm });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/deliveries/my
exports.getMyDeliveries = async (req, res) => {
  try {
    const role  = req.query.role || req.user.activeRole;
    const query = role === 'carrier' ? { carrier: req.user._id } : { receiver: req.user._id };
    const dels  = await Delivery.find(query)
      .populate('receiver', 'fullName rating college phone')
      .populate('carrier',  'fullName rating stats phone')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, deliveries: dels });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/deliveries/:id
exports.getOne = async (req, res) => {
  try {
    const del = await Delivery.findById(req.params.id)
      .populate('receiver', 'fullName rating college phone')
      .populate('carrier',  'fullName rating stats phone isOnline lastLocation');
    if (!del) return res.status(404).json({ success: false, message: 'Not found' });
    const uid = req.user._id.toString();
    const ok  = del.receiver._id.toString() === uid || del.carrier?._id?.toString() === uid || req.user.roles.includes('admin');
    if (!ok) return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, delivery: del });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/deliveries/:id/cancel
exports.cancel = async (req, res) => {
  try {
    const { reason } = req.body;
    const del = await Delivery.findById(req.params.id);
    if (!del) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['pending','accepted'].includes(del.status))
      return res.status(400).json({ success: false, message: 'Cannot cancel at this stage' });

    const platCut = parseInt(process.env.PLATFORM_CUT) || 7;
    const total   = del.commission.current + platCut;

    const receiver = await User.findById(del.receiver);
    receiver.wallet.escrow  -= total;
    receiver.wallet.balance += total;
    await receiver.save();

    await Transaction.create({ user: receiver._id, delivery: del._id, type: 'escrow_refund', amount: total, direction: 'credit', note: 'Refund on cancellation' });

    del.status = 'cancelled';
    del.cancelledAt = new Date();
    del.cancellation = { cancelledBy: req.user._id, reason };
    await del.save();

    req.io.to(`delivery_${del._id}`).emit('delivery_cancelled', { deliveryId: del._id, reason });
    req.io.emit('delivery_cancelled_feed', { deliveryId: del._id });

    res.json({ success: true, refundAmount: total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/deliveries/:id/dispute
exports.dispute = async (req, res) => {
  try {
    const { reason, description } = req.body;
    const del = await Delivery.findById(req.params.id);
    if (!del) return res.status(404).json({ success: false, message: 'Not found' });
    del.status  = 'disputed';
    del.dispute = { raisedBy: req.user._id, reason, description, status: 'open' };
    await del.save();
    req.io.emit('admin_new_dispute', { deliveryId: del._id, deliveryCode: del.deliveryCode, reason, raisedBy: req.user.fullName });
    res.json({ success: true, message: 'Dispute raised. Team reviews within 24h.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PATCH /api/deliveries/:id/location
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await User.findByIdAndUpdate(req.user._id, { lastLocation: { type: 'Point', coordinates: [lng, lat] } });
    req.io.to(`delivery_${req.params.id}`).emit('carrier_location', { deliveryId: req.params.id, lat, lng, ts: new Date() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/deliveries/:id/refresh-otp
exports.refreshOtp = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Not found' });

    const uid = req.user._id.toString();
    // Compare plain receiver ID — delivery.receiver is an ObjectId (not populated)
    if (delivery.receiver.toString() !== uid)
      return res.status(403).json({ success: false, message: 'Only receiver can refresh OTP' });

    if (!['accepted', 'pickup_verified'].includes(delivery.status))
      return res.status(400).json({ success: false, message: 'Cannot refresh OTP at this stage' });

    const plain     = Math.floor(1000 + Math.random() * 9000).toString();
    const hash      = await bcrypt.hash(plain, 10);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Return keys matching what the frontend store expects
    let pickupOtp = null, deliveryOtp = null;
    if (delivery.status === 'accepted') {
      delivery.otps.pickup = { hash, plain, expiresAt };
      pickupOtp = plain;
    } else {
      delivery.otps.delivery = { hash, plain, expiresAt };
      deliveryOtp = plain;
    }
    await delivery.save();

    res.json({ success: true, otp: plain, pickupOtp, deliveryOtp, expiresAt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
