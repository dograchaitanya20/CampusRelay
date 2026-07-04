const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName:     { type: String, required: true, trim: true },
  phone:        { type: String, required: true, unique: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  roles:        { type: [String], enum: ['receiver','carrier','admin'], default: ['receiver'] },
  activeRole:   { type: String, enum: ['receiver','carrier'], default: 'receiver' },

  college: {
    name:        String,
    branch:      String,
    year:        Number,
    hostelBlock: String,
    roomNumber:  String,
    isDayScholar:{ type: Boolean, default: false },
  },

  kyc: {
    collegeIdUrl:    String,
    aadhaarUrl:      String,
    selfieUrl:       String,
    faceMatchScore:  Number,
    faceMatchPassed: Boolean,
    status: { type: String, enum: ['pending','ai_verified','approved','rejected'], default: 'pending' },
    rejectionReason: String,
    submittedAt:     Date,
    reviewedAt:      Date,
    reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },

  isActive:  { type: Boolean, default: false },
  isBanned:  { type: Boolean, default: false },
  banReason: String,

  upiId: String,
  wallet: {
    balance:     { type: Number, default: 0 },
    escrow:      { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent:  { type: Number, default: 0 },
  },

  rating: {
    average:   { type: Number, default: 0 },
    count:     { type: Number, default: 0 },
    breakdown: { type: [Number], default: [0,0,0,0,0] },
  },

  stats: {
    deliveriesAsReceiver: { type: Number, default: 0 },
    deliveriesAsCarrier:  { type: Number, default: 0 },
    streak:               { type: Number, default: 0 },
    lastActive:           Date,
  },

  fcmToken:  String,
  isOnline:  { type: Boolean, default: false },
  lastLocation: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
}, { timestamps: true });

userSchema.index({ lastLocation: '2dsphere' });
userSchema.index({ 'kyc.status': 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.addRating = function(stars) {
  this.rating.breakdown[stars - 1]++;
  this.rating.count++;
  this.rating.average = this.rating.breakdown.reduce((s, v, i) => s + v * (i + 1), 0) / this.rating.count;
};

userSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id, fullName: this.fullName, phone: this.phone, email: this.email,
    roles: this.roles, activeRole: this.activeRole, college: this.college,
    kyc: {
      status:          this.kyc?.status,
      faceMatchPassed: this.kyc?.faceMatchPassed,
      faceMatchScore:  this.kyc?.faceMatchScore,
      // Expose as booleans so the Profile page can show ✅/⏳ without leaking URLs
      collegeIdUrl:    this.kyc?.collegeIdUrl  ? true : undefined,
      aadhaarUrl:      this.kyc?.aadhaarUrl    ? true : undefined,
      selfieUrl:       this.kyc?.selfieUrl     ? true : undefined,
    },
    isActive: this.isActive, isBanned: this.isBanned, upiId: this.upiId,
    wallet: this.wallet, rating: this.rating, stats: this.stats, isOnline: this.isOnline,
  };
};

module.exports = mongoose.model('User', userSchema);
