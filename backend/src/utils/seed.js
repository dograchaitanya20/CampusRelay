require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({});

  const users = [
    { fullName:'Admin CampusRelay', phone:'9000000000', passwordHash:'Admin@123',
      roles:['admin','receiver'], activeRole:'receiver', isActive:true,
      college:{ name:'NIT Campus', branch:'Admin' }, kyc:{ status:'approved' }, wallet:{ balance:1000 } },
    { fullName:'Aryan Sharma',   phone:'9111111111', passwordHash:'Test@123',
      roles:['receiver'], activeRole:'receiver', isActive:true,
      college:{ name:'NIT Campus', branch:'BTech CSE', year:2, hostelBlock:'Block C', roomNumber:'C-204' },
      kyc:{ status:'approved' }, wallet:{ balance:500 } },
    { fullName:'Rahul Kumar',    phone:'9222222222', passwordHash:'Test@123',
      roles:['carrier','receiver'], activeRole:'carrier', isActive:true,
      college:{ name:'NIT Campus', branch:'BTech ECE', year:3, isDayScholar:true },
      kyc:{ status:'approved' }, upiId:'rahul@upi',
      wallet:{ balance:120, totalEarned:450 },
      rating:{ average:4.9, count:23 }, stats:{ deliveriesAsCarrier:23, streak:5 } },
    { fullName:'Priya Singh',    phone:'9333333333', passwordHash:'Test@123',
      roles:['carrier'], activeRole:'carrier', isActive:true,
      college:{ name:'NIT Campus', branch:'BTech ME', year:2, isDayScholar:true },
      kyc:{ status:'approved' }, upiId:'priya@upi',
      wallet:{ balance:80, totalEarned:210 },
      rating:{ average:4.7, count:11 }, stats:{ deliveriesAsCarrier:11 } },
    { fullName:'Vikram Mehta',   phone:'9444444444', passwordHash:'Test@123',
      roles:['receiver'], activeRole:'receiver', isActive:false,
      college:{ name:'NIT Campus', branch:'BTech IT', year:1, hostelBlock:'Block A', roomNumber:'A-108' },
      kyc:{ status:'pending', submittedAt: new Date() }, wallet:{ balance:200 } },
  ];

  

const created = [];

for (const u of users) {
  const doc = new User(u);
  await doc.save();
  created.push(doc);
}
  console.log(`✅ Seeded ${created.length} users\n`);
  console.log('🔑 Test accounts:');
  console.log('   Admin:    9000000000 / Admin@123');
  console.log('   Receiver: 9111111111 / Test@123');
  console.log('   Carrier:  9222222222 / Test@123\n');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
