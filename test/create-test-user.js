// create-test-user.js - Creates a test user in PocketBase
require('dotenv').config();
const PocketBase = require('pocketbase/cjs');
const logger = require('../logger');

// Get user to create from command line args
const username = process.argv[2] || 'testuser';
const email = process.argv[3] || `${username}@example.com`;
const password = process.argv[4] || 'Test1234!';

// Create PocketBase client
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

// Create a user
async function createUser(username, email, password) {
  console.log(`\n🔧 Creating test user`);
  console.log('=====================');
  console.log(`Username: ${username}`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  
  try {
    // Check if user already exists
    try {
      const existingUser = await pb.collection('users').getFirstListItem(`username="${username}" || email="${email}"`);
      console.log(`\n⚠️ User already exists!`);
      console.log(`ID: ${existingUser.id}`);
      console.log(`Username: ${existingUser.username}`);
      console.log(`Email: ${existingUser.email}`);
      console.log(`Created: ${new Date(existingUser.created).toLocaleString()}`);
      
      // Ask if we should update the password
      console.log(`\nDo you want to update the password? (y/n)`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('> ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            await pb.collection('users').update(existingUser.id, {
              password,
              passwordConfirm: password
            });
            console.log('✅ Password updated successfully');
          } catch (updateError) {
            console.error('❌ Failed to update password:', updateError.message);
          }
        }
        readline.close();
      });
      
      return existingUser;
    } catch (notFoundError) {
      // User doesn't exist, continue with creation
      console.log(`\nℹ️ User doesn't exist, creating now...`);
    }
    
    // Create the user
    const userData = {
      email,
      password,
      passwordConfirm: password,
      username,
      emailVisibility: true,
      verified: true
    };
    
    // Log the data we're sending to create the user
    console.log(`\nCreating user with data:`);
    console.log(`Email: ${userData.email}`);
    console.log(`Username: ${userData.username}`);
    console.log(`Password: ${password.substring(0, 3)}***`);
    
    const newUser = await pb.collection('users').create(userData);
    console.log(`\n✅ User created successfully!`);
    console.log(`ID: ${newUser.id}`);
    console.log(`Username: ${newUser.username}`);
    console.log(`Email: ${newUser.email}`);
    
    // Create a user profile
    try {
      const profile = await pb.collection('user_profiles').create({
        user: newUser.id,
        display_name: username,
        onboarding_completed: true
      });
      console.log(`✅ User profile created successfully! (ID: ${profile.id})`);
    } catch (profileError) {
      console.error(`⚠️ Failed to create user profile: ${profileError.message}`);
      // Profile creation failed but user was created successfully
    }
    
    return newUser;
  } catch (error) {
    console.error(`\n❌ Failed to create user:`, error.message);
    console.error(`Status: ${error.status}, Data:`, JSON.stringify(error.data || {}, null, 2));
    throw error;
  }
}

// Main function
async function main() {
  try {
    await authenticateAsAdmin();
    await createUser(username, email, password);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 