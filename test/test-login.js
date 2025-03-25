// test-login.js - Simple script to test login
require('dotenv').config();
const { pocketBaseService: pbService } = require('../server/services/pocketbase');
const logger = require('../logger');

// Get login credentials from command line args
const identity = process.argv[2] || 'user1@example.com';
const password = process.argv[3] || 'Test1234!';

async function testLogin() {
  console.log(`\n🔑 TESTING LOGIN`);
  console.log('===============');
  console.log(`Identity: ${identity}`);
  console.log(`Password: ${password}`);
  
  try {
    // Try to login
    console.log('\nAttempting login...');
    const authData = await pbService.loginUser(identity, password);
    
    console.log(`\n✅ Login successful!`);
    console.log(`User ID: ${authData.record.id}`);
    console.log(`Email: ${authData.record.email}`);
    console.log(`Username: ${authData.record.username}`);
    console.log(`Token: ${authData.token.substring(0, 20)}...`);
    
    // Try to get user profile
    try {
      console.log('\nFetching user profile...');
      const userData = await pbService.getCompleteUserData(authData.record.id);
      
      console.log(`\n✅ Profile retrieved!`);
      console.log(`Display Name: ${userData.display_name || 'Not set'}`);
      console.log(`Onboarding Completed: ${userData.onboarding_completed ? 'Yes' : 'No'}`);
    } catch (profileError) {
      console.error(`\n❌ Failed to get profile: ${profileError.message}`);
    }
  } catch (error) {
    console.error(`\n❌ Login failed: ${error.message}`);
    
    if (error.status) {
      console.error(`Status: ${error.status}`);
    }
    
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
    
    // Provide troubleshooting advice
    console.log('\n🔍 Troubleshooting suggestions:');
    
    if (error.message.includes('not found') || error.message.includes('User not found')) {
      console.log('1. Check if the user exists:');
      console.log(`   node test/check-user.js ${identity}`);
      console.log('2. Try creating the user:');
      console.log(`   node test/create-test-user.js ${identity.includes('@') ? identity.split('@')[0] : identity} ${identity.includes('@') ? identity : identity + '@example.com'} ${password}`);
    } else if (error.message.includes('password') || error.message.includes('Password')) {
      console.log('1. Make sure the password is correct');
      console.log('2. Try resetting the password:');
      console.log(`   node test/create-test-user.js ${identity.includes('@') ? identity.split('@')[0] : identity} ${identity.includes('@') ? identity : identity + '@example.com'} ${password}`);
      console.log('   (Choose "y" when asked to update the password)');
    } else {
      console.log('1. Check PocketBase server connection:');
      console.log('   node test/check-pocketbase.js');
      console.log('2. Verify user account details:');
      console.log(`   node test/check-user.js ${identity}`);
    }
  }
}

// Run the test
testLogin(); 