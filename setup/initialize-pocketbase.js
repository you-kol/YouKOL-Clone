require('dotenv').config();
const PocketBase = require('pocketbase/cjs');
const path = require('path');
const fs = require('fs');

// Create PocketBase client
const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(pbUrl);

// Configure timeout based on PocketBase version
if (typeof pb.http?.setTimeout === 'function') {
  // v0.26.3+ method
  pb.http.setTimeout(30000);
} else if (pb.axios?.defaults) {
  // v0.21.1 method
  pb.axios.defaults.timeout = 30000;
}

// Disable auto cancellation
pb.autoCancellation(false);

// Load credentials from environment
const adminEmail = process.env.POCKETBASE_USER;
const adminPassword = process.env.POCKETBASE_PASS;

// Helper function for authentication as admin/superuser
async function authenticateAsAdmin() {
  if (!adminEmail || !adminPassword) {
    throw new Error('Admin credentials not found in environment variables');
  }

  let authenticationMethod = '';
  
  try {
    // First try the v0.26.3+ superuser authentication
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as superuser (v0.26.3+)');
    authenticationMethod = 'superuser';
  } catch (superuserError) {
    console.log('🔄 Superuser authentication failed, trying legacy admin method...');
    
    try {
      // Try v0.21.1 admin authentication
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('✅ Authenticated as admin (v0.21.1)');
      console.warn('⚠️ Using legacy admin authentication. Please migrate to superuser (_superusers collection).');
      authenticationMethod = 'admin';
    } catch (adminError) {
      // Both authentication methods failed
      console.error('❌ Authentication failed with both superuser and admin methods');
      
      // Generate helpful error message
      const errorDetails = superuserError.message || adminError.message;
      
      if (errorDetails.includes('404') || superuserError.status === 404) {
        console.error('ℹ️ The _superusers collection may not exist yet. This is expected for first-time setup.');
        console.log('🔄 Attempting to create a superuser account...');
        
        try {
          // Try to create the first superuser account
          const data = {
            email: adminEmail,
            password: adminPassword,
            passwordConfirm: adminPassword
          };
          
          // For v0.26.3+, we might need to access the admin UI first to set up
          console.log(`⚠️ Please ensure you've accessed the PocketBase Admin UI at ${pbUrl}/_/ at least once`);
          console.log('⚠️ This is required to initialize the _superusers collection');
          
          throw new Error('Manual superuser creation required via Admin UI');
        } catch (createError) {
          console.error('❌ Failed to create superuser:', createError.message);
          throw new Error(`Failed to authenticate or create admin account: ${errorDetails}`);
        }
      } else if (errorDetails.includes('401') || superuserError.status === 401 || adminError.status === 401) {
        throw new Error('❌ Invalid admin credentials. Please check your POCKETBASE_USER and POCKETBASE_PASS environment variables.');
      } else {
        throw new Error(`❌ Authentication failed: ${errorDetails}`);
      }
    }
  }
  
  return authenticationMethod;
}

// Helper function to check if collection exists
async function collectionExists(name) {
  try {
    const collections = await pb.collections.getFullList();
    return collections.some(collection => collection.name === name);
  } catch (error) {
    console.error(`Error checking if collection ${name} exists:`, error);
    return false;
  }
}

// Helper function to create or update collection
async function createOrUpdateCollection(name, schema) {
  try {
    const exists = await collectionExists(name);
    
    if (exists) {
      console.log(`Collection ${name} already exists, updating...`);
      await pb.collections.update(name, schema);
      console.log(`✅ Updated collection ${name}`);
    } else {
      console.log(`Creating collection ${name}...`);
      await pb.collections.create(schema);
      console.log(`✅ Created collection ${name}`);
    }
  } catch (error) {
    console.error(`❌ Error creating/updating collection ${name}:`, error);
    throw error;
  }
}

// Main initialization function
async function initialize() {
  console.log(`🔄 Connecting to PocketBase at ${pbUrl}...`);
  
  try {
    // Try to authenticate as admin
    const authMethod = await authenticateAsAdmin();
    console.log(`✅ Connected to PocketBase as ${authMethod}`);
    
    // Define schema for user_profiles collection
    const userProfilesSchema = {
      name: 'user_profiles',
      type: 'base',
      schema: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          options: {
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
            minSelect: 1
          }
        },
        {
          name: 'display_name',
          type: 'text',
          required: true
        },
        {
          name: 'bio',
          type: 'text'
        },
        {
          name: 'avatar',
          type: 'file',
          options: {
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
            thumbs: ['100x100']
          }
        }
      ]
    };
    
    // Create or update user_profiles collection
    await createOrUpdateCollection('user_profiles', userProfilesSchema);
    
    // Print completion message
    console.log('✅ PocketBase initialization complete!');
    
    // Version-specific guidance
    if (authMethod === 'admin') {
      console.log('\n⚠️ You are using PocketBase v0.21.1 or earlier with legacy admin authentication.');
      console.log('⚠️ For v0.26.3+, you should migrate to the _superusers collection.');
      console.log('⚠️ See the upgrade guide in documentation/pocketbase-v0.26.3-upgrade-guide.md');
    } else {
      console.log('\n✅ You are using PocketBase v0.26.3+ with the _superusers collection.');
    }
    
  } catch (error) {
    console.error('❌ PocketBase initialization failed:', error.message);
    process.exit(1);
  }
}

// Run the initialization
initialize(); 