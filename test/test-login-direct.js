// test-login-direct.js - Direct PocketBase authentication test
require('dotenv').config();
const PocketBase = require('pocketbase/cjs');
const logger = require('../logger');

// Get login credentials from command line args
const identity = process.argv[2] || 'user1@example.com';
const password = process.argv[3] || 'Test1234!';

// Create a fresh PocketBase client
const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(pbUrl);

// Configure timeout
if (typeof pb.http?.setTimeout === 'function') {
  pb.http.setTimeout(30000);
} else if (pb.axios?.defaults) {
  pb.axios.defaults.timeout = 30000;
}

// Disable auto cancellation
pb.autoCancellation(false);

async function authAdmin() {
  try {
    const adminEmail = process.env.POCKETBASE_USER || process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_PASS || process.env.POCKETBASE_ADMIN_PASSWORD;
    
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin');
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
  }
}

async function checkCollections() {
  try {
    console.log('\n📋 Collections Check');
    const collections = await pb.collections.getFullList();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(c => console.log(`- ${c.name}`));
    
    // Check users collection specifically
    const usersCollection = collections.find(c => c.name === 'users');
    if (usersCollection) {
      console.log(`\n✅ Users collection exists`);
      console.log(`ID: ${usersCollection.id}`);
      console.log(`Type: ${usersCollection.type}`);
      
      // Get the schema
      try {
        console.log(`Schema: ${JSON.stringify(usersCollection.schema).substring(0, 100)}...`);
      } catch (e) {
        console.log(`Schema: Could not stringify`);
      }
    } else {
      console.log(`\n❌ Users collection not found!`);
    }
  } catch (error) {
    console.error('❌ Collections check failed:', error.message);
  }
}

async function findUser() {
  try {
    console.log(`\n🔍 Looking for user: ${identity}`);
    
    // Determine if we're looking for email or username
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity);
    console.log(`Input type: ${isEmail ? 'email' : 'username'}`);
    
    // First try to list all users
    try {
      console.log('\nFetching all users...');
      const allUsers = await pb.collection('users').getFullList({
        sort: '-created',
      });
      
      console.log(`Found ${allUsers.length} total users`);
      
      // Check if our user is in the list
      const foundUser = allUsers.find(u => 
        (isEmail && u.email === identity) || 
        (!isEmail && u.username === identity)
      );
      
      if (foundUser) {
        console.log(`\n✅ User found by scanning all records!`);
        console.log(`ID: ${foundUser.id}`);
        console.log(`Email: ${foundUser.email}`);
        console.log(`Username: ${foundUser.username}`);
        console.log(`Created: ${foundUser.created}`);
      } else {
        console.log(`\n❌ User not found in full user list`);
        
        // Print first few users for debugging
        console.log('\nMost recent users:');
        allUsers.slice(0, 3).forEach((user, i) => {
          console.log(`User ${i+1}:`);
          console.log(`- ID: ${user.id}`);
          console.log(`- Email: ${user.email}`);
          console.log(`- Username: ${user.username || 'not set'}`);
        });
      }
    } catch (listError) {
      console.error('❌ Failed to list all users:', listError.message);
    }
    
    // Try with direct filter
    try {
      const filter = isEmail ? `email="${identity}"` : `username="${identity}"`;
      console.log(`\nSearching with filter: ${filter}`);
      
      const searchResult = await pb.collection('users').getList(1, 10, {
        filter
      });
      
      if (searchResult.totalItems > 0) {
        console.log(`\n✅ User found via filter!`);
        const user = searchResult.items[0];
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Username: ${user.username}`);
      } else {
        console.log(`\n❌ User not found via filter`);
      }
    } catch (filterError) {
      console.error('❌ Filter search failed:', filterError.message);
      console.error(`Status: ${filterError.status}, Data:`, filterError.data);
    }
  } catch (error) {
    console.error('❌ Find user operation failed:', error.message);
  }
}

async function testLogin() {
  console.log(`\n🔑 Direct Authentication Test`);
  console.log('=========================');
  console.log(`Identity: ${identity}`);
  console.log(`Password: ${password}`);
  console.log(`PocketBase URL: ${pbUrl}`);
  
  try {
    console.log('\nAttempting direct authentication...');
    const authData = await pb.collection('users').authWithPassword(identity, password);
    
    console.log(`\n✅ Authentication successful!`);
    console.log(`User ID: ${authData.record.id}`);
    console.log(`Email: ${authData.record.email}`);
    console.log(`Username: ${authData.record.username}`);
    console.log(`Token: ${authData.token.substring(0, 20)}...`);
  } catch (error) {
    console.error(`\n❌ Authentication failed: ${error.message}`);
    console.error(`Status: ${error.status}, Data:`, error.data);
    
    // Try email authentication if username was provided
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity);
    if (!isEmail) {
      console.log(`\nUsername authentication failed. Trying to find email for "${identity}"...`);
      
      try {
        // Try to find all users and scan manually
        const allUsers = await pb.collection('users').getFullList();
        const user = allUsers.find(u => u.username === identity);
        
        if (user) {
          console.log(`\nFound user by username. Trying authentication with email: ${user.email}`);
          
          try {
            const authData = await pb.collection('users').authWithPassword(user.email, password);
            console.log(`\n✅ Email authentication successful!`);
            console.log(`User ID: ${authData.record.id}`);
            console.log(`Email: ${authData.record.email}`);
            console.log(`Username: ${authData.record.username}`);
          } catch (emailAuthError) {
            console.error(`\n❌ Email authentication also failed: ${emailAuthError.message}`);
          }
        } else {
          console.log(`\n❌ Could not find user with username "${identity}"`);
        }
      } catch (findError) {
        console.error('❌ Failed to search for user:', findError.message);
      }
    }
  }
}

// Main function
async function main() {
  try {
    await authAdmin();
    await checkCollections();
    await findUser();
    await testLogin();
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
main(); 