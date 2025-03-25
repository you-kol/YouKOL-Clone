// check-user.js - Tool to check if a user exists in PocketBase
require('dotenv').config();
const PocketBase = require('pocketbase/cjs');
const logger = require('../logger');

// Get user to check from command line args
const userToCheck = process.argv[2];

// Check for --collection flag
let userCollection = 'users';
const collectionArg = process.argv.find(arg => arg.startsWith('--collection='));
if (collectionArg) {
  userCollection = collectionArg.split('=')[1];
}

if (!userToCheck) {
  console.error('Please provide a username or email to check');
  console.error('Usage: node test/check-user.js <username or email> [--collection=name]');
  process.exit(1);
}

// Create PocketBase client
const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(pbUrl);

// Configure timeout
if (typeof pb.http?.setTimeout === 'function') {
  // v0.26.3+ method
  pb.http.setTimeout(30000);
} else if (pb.axios?.defaults) {
  // v0.21.1 method
  pb.axios.defaults.timeout = 30000;
}

// Disable auto cancellation
pb.autoCancellation(false);

// Function to authenticate as admin
async function authenticateAsAdmin() {
  const email = process.env.POCKETBASE_USER || process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_PASS || process.env.POCKETBASE_ADMIN_PASSWORD;
  
  if (!email || !password) {
    throw new Error('Admin credentials not found in environment variables');
  }

  try {
    // Try superuser auth (v0.26.3+)
    await pb.collection('_superusers').authWithPassword(email, password);
    console.log('✅ Authenticated as superuser');
  } catch (superuserError) {
    try {
      // Try legacy admin auth (v0.21.1)
      await pb.admins.authWithPassword(email, password);
      console.log('✅ Authenticated as admin (legacy)');
    } catch (adminError) {
      console.error('❌ Authentication failed:', adminError.message);
      throw new Error('Failed to authenticate as admin');
    }
  }
}

// Check if a user exists by username or email
async function checkUserExists(identity) {
  console.log(`\n🔍 Checking if user exists: ${identity}`);
  console.log('=====================================');
  
  // Determine if identity is email or username
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity);
  console.log(`ℹ️ Treating input as: ${isEmail ? 'email' : 'username'}`);
  
  try {
    // Try to find user
    const filter = isEmail ? `email="${identity}"` : `username="${identity}"`;
    console.log(`ℹ️ Using filter: ${filter}`);
    
    const result = await pb.collection(userCollection).getList(1, 10, { filter });
    
    if (result.items.length > 0) {
      console.log(`\n✅ User found! (${result.items.length} match${result.items.length > 1 ? 'es' : ''})`);
      
      // Show user details
      result.items.forEach((user, index) => {
        console.log(`\n👤 User ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Created: ${new Date(user.created).toLocaleString()}`);
        console.log(`   Email Verified: ${user.verified ? 'Yes' : 'No'}`);
        
        // Try to get user profile
        getProfile(user.id);
      });
    } else {
      console.log(`\n❌ No user found with ${isEmail ? 'email' : 'username'}: ${identity}`);
      
      // Provide suggestions if username
      if (!isEmail) {
        console.log('\nℹ️ Trying partial username match...');
        const fuzzyResult = await pb.collection(userCollection).getList(1, 5, { 
          filter: `username ~ "${identity}"` 
        });
        
        if (fuzzyResult.items.length > 0) {
          console.log(`\n💡 Found similar usernames:`);
          fuzzyResult.items.forEach(user => {
            console.log(`   - ${user.username} (${user.email})`);
          });
        } else {
          console.log('❌ No similar usernames found');
        }
      }
    }
  } catch (error) {
    console.error(`\n❌ Error checking for user:`, error.message);
    console.error(`   Status: ${error.status}, Code: ${error.code || 'unknown'}`);
    console.error(`   Details:`, JSON.stringify(error.data || {}, null, 2));
    
    // If it's an API error with a 404 status, provide a more helpful message
    if (error.status === 404) {
      console.log(`\n⚠️ The collection '${userCollection}' might not have the correct schema or might not exist.`);
      console.log(`   Try running the PocketBase check script: node test/check-pocketbase.js`);
    } else if (error.message.includes('Something went wrong')) {
      console.log(`\n⚠️ This appears to be a server error. Try checking the PocketBase server logs.`);
      
      // List all collections to see what's available
      try {
        console.log(`\n📋 Listing available collections to help troubleshoot...`);
        const collections = await pb.collections.getFullList();
        console.log(`   Found ${collections.length} collections in total:`);
        collections.forEach(collection => {
          console.log(`   - ${collection.name}`);
        });
        
        // Try to find any users collection
        const usersCollection = collections.find(c => c.name.includes('user'));
        if (usersCollection) {
          console.log(`\n💡 Found a possible users collection: ${usersCollection.name}`);
          console.log(`   Try running: node test/check-user.js ${identity} --collection=${usersCollection.name}`);
        }
      } catch (listError) {
        console.error(`   Couldn't list collections:`, listError.message);
      }
    }
  }
}

// Get user profile
async function getProfile(userId) {
  // Try user_profiles collection first
  try {
    const profile = await pb.collection('user_profiles').getFirstListItem(`user="${userId}"`);
    console.log(`   Profile: Found (in user_profiles collection)`);
    console.log(`   Display Name: ${profile.display_name || 'Not set'}`);
    console.log(`   Onboarding Completed: ${profile.onboarding_completed ? 'Yes' : 'No'}`);
    return;
  } catch (profileError) {
    // If not found, continue to try other possible profile collections
    console.log(`   Profile: Not found in user_profiles collection`);
  }
  
  // Try with the collection name as a prefix (e.g., 'users_profiles')
  try {
    const profileCollectionName = `${userCollection}_profiles`;
    const profile = await pb.collection(profileCollectionName).getFirstListItem(`user="${userId}"`);
    console.log(`   Profile: Found (in ${profileCollectionName} collection)`);
    console.log(`   Fields: ${Object.keys(profile).filter(key => !['id', 'created', 'updated', 'collectionId', 'collectionName'].includes(key)).join(', ')}`);
    return;
  } catch (prefixError) {
    // Not found in prefix collection either
  }
  
  // Try to list all collections that might contain profiles
  try {
    const collections = await pb.collections.getFullList();
    const profileCollections = collections.filter(c => 
      c.name.includes('profile') || 
      c.name.includes('user_') || 
      c.name === 'profiles'
    );
    
    if (profileCollections.length > 0) {
      console.log(`   Profile: No profile found, but these collections might contain profiles:`);
      profileCollections.forEach(c => {
        console.log(`     - ${c.name}`);
      });
    } else {
      console.log(`   Profile: No profile collections found`);
    }
  } catch (listError) {
    console.log(`   Profile: Not found and couldn't check for profile collections`);
  }
}

// Main function
async function main() {
  try {
    await authenticateAsAdmin();
    await checkUserExists(userToCheck);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}); 