const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const D = require('./src/models/Delivery');
  const r = await D.updateMany({ status: 'pending' }, { status: 'cancelled' });
  console.log('Cleared:', r.modifiedCount, 'pending deliveries');
  process.exit();
});