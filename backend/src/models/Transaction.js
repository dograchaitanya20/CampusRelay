const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delivery:  { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
  type:      { type: String, enum: ['topup','escrow_lock','escrow_release','escrow_refund','commission_earn','platform_cut','withdrawal'], required: true },
  amount:    { type: Number, required: true },
  direction: { type: String, enum: ['credit','debit'], required: true },
  balanceBefore: Number,
  balanceAfter:  Number,
  razorpay: { orderId: String, paymentId: String, signature: String },
  note:      String,
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });

const messageSchema = new mongoose.Schema({
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type:     { type: String, enum: ['text','system','photo'], default: 'text' },
  content:  String,
  mediaUrl: String,
  systemEvent: String,
  isRead:   { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ delivery: 1, createdAt: 1 });

module.exports = {
  Transaction: mongoose.model('Transaction', transactionSchema),
  Message:     mongoose.model('Message', messageSchema),
};
