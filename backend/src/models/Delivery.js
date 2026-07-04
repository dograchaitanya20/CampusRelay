const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryCode: {
    type: String,
    default: () => 'CR-' + Math.random().toString(36).slice(2,8).toUpperCase(),
    unique: true,
  },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  carrier:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  package: {
    app:         { type: String, enum: ['zomato','blinkit','swiggy','amazon','flipkart','other'], required: true },
    description: { type: String, required: true },
    isFragile:   { type: Boolean, default: false },
  },

  window: {
    from: { type: Date, required: true },
    to:   { type: Date, required: true },
  },

  destination: {
    hostelBlock: { type: String, required: true },
    roomNumber:  { type: String },
    landmark:    String,
  },

  commission: {
    initial:   { type: Number, default: 30 },
    current:   { type: Number, default: 30 },
    bumpCount: { type: Number, default: 0 },
    paid:      Number,
  },

  status: {
    type: String,
    enum: ['pending','accepted','pickup_verified','in_transit','delivered','cancelled','disputed'],
    default: 'pending',
  },

  otps: {
    pickup:   { hash: String, plain: String, expiresAt: Date, verified: { type: Boolean, default: false } },
    delivery: { hash: String, plain: String, expiresAt: Date, verified: { type: Boolean, default: false } },
  },

  photos: {
    atPickup:   String,
    atDelivery: String,
  },

  gpsLog: [{ lat: Number, lng: Number, timestamp: Date }],

  checkpoints: [{
    name:      String,
    timestamp: Date,
    note:      String,
    _id:       false,
  }],

  dispute: {
    raisedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason:      String,
    description: String,
    status:      { type: String, enum: ['open','investigating','resolved'], default: 'open' },
    resolution:  String,
    resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt:  Date,
  },

  ratings: {
    byReceiver: { stars: Number, tags: [String], comment: String, createdAt: Date },
    byCarrier:  { stars: Number, tags: [String], comment: String, createdAt: Date },
  },

  acceptedAt:  Date,
  pickedUpAt:  Date,
  deliveredAt: Date,
  cancelledAt: Date,

  cancellation: {
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason:      String,
  },
}, { timestamps: true });

deliverySchema.index({ receiver: 1, status: 1 });
deliverySchema.index({ carrier:  1, status: 1 });
deliverySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);
