require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');

const ADMIN = {
  fullName:     'Campus Admin',
  phone:        '9999999999',
  email:        'admin@campusrelay.com',
  passwordHash: 'Admin@123',          // plain password — model hashes it on save
  roles:        ['receiver', 'carrier', 'admin'],
  activeRole:   'receiver',
  isActive:     true,
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const existing = await User.findOne({ phone: ADMIN.phone });
  if (existing) {
    console.log('⚠️  Admin already exists:', existing.phone);
    process.exit(0);
  }

  const admin = new User(ADMIN);
  await admin.save();
  console.log('🎉 Admin created!');
  console.log('   Phone   :', ADMIN.phone);
  console.log('   Password: Admin@123');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
