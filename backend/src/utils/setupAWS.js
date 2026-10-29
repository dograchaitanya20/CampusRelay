/**
 * CampusRelay — One-time AWS Setup Script
 * Run ONCE after setting AWS credentials in .env
 * 
 * Usage: node src/utils/setupAWS.js
 */

require('dotenv').config();
const { createFaceCollection } = require('./rekognition');

async function setup() {
  console.log('🚀 Setting up AWS Rekognition for CampusRelay...\n');

  // Validate env vars
  const required = ['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_REGION'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('   Add them to your .env file first.');
    process.exit(1);
  }

  console.log('✅ AWS credentials found');
  console.log(`   Region: ${process.env.AWS_REGION}`);
  console.log(`   Key ID: ${process.env.AWS_ACCESS_KEY_ID.slice(0,8)}...`);

  // Create face collection
  await createFaceCollection();

  console.log('\n🎉 AWS setup complete!');
  console.log('   Face collection: campusrelay-faces');
  console.log('   KYC auto-approval is now active.');
  console.log('\nFree tier: 1,000 verifications/month at ₹0\n');
}

setup().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
