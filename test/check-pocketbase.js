// test/check-pocketbase.js
const PocketBase = require('pocketbase/cjs');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Create a PocketBase client with the URL from .env or default
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

// Get authentication details from .env
const adminEmail = process.env.POCKETBASE_USER;
const adminPassword = process.env.POCKETBASE_PASS;

// Main function to check PocketBase connection and status
async function checkPocketBase() {
  console.log(`\n🔍 POCKETBASE DIAGNOSTIC CHECK`);
  console.log(`============================\n`);
  
  // Step 1: Check connection to the server
  console.log(`1️⃣ Server Connection Check`);
  console.log(`   URL: ${pbUrl}`);
  
  try {
    // Check health endpoint
    const healthResponse = await pb.health.check();
    console.log(`   ✅ Server is responding! Status: ${healthResponse.code || 'OK'}`);
    
    // Try to get the PocketBase version
    try {
      const settingsResponse = await pb.settings.getAll();
      if (settingsResponse?.meta?.appName) {
        console.log(`   ℹ️ App Name: ${settingsResponse.meta.appName}`);
      }
      console.log(`   ✅ PocketBase is running and responding to API requests`);
    } catch (settingsError) {
      console.log(`   ⚠️ Could not retrieve PocketBase settings: ${settingsError.message}`);
      console.log(`   ℹ️ This is normal if you're not authenticated yet`);
    }
  } catch (connectionError) {
    console.error(`   ❌ Failed to connect to PocketBase: ${connectionError.message}`);
    console.error(`   ⚠️ Please ensure PocketBase is running at ${pbUrl}`);
    process.exit(1);
  }
  
  // Step 2: Authentication check
  console.log(`\n2️⃣ Authentication Check`);
  
  if (!adminEmail || !adminPassword) {
    console.error(`   ❌ Missing credentials in .env file`);
    console.error(`   ⚠️ Please set POCKETBASE_USER and POCKETBASE_PASS in your .env file`);
    process.exit(1);
  }
  
  console.log(`   ℹ️ Attempting authentication with email: ${adminEmail}`);
  
  // First try superuser authentication (v0.26.3+)
  let authMethod = null;
  try {
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    console.log(`   ✅ Successfully authenticated as superuser (v0.26.3+)`);
    authMethod = 'superuser';
  } catch (superuserError) {
    console.log(`   ⚠️ Superuser authentication failed: ${superuserError.message}`);
    console.log(`   ℹ️ Trying legacy admin authentication...`);
    
    // Try legacy admin authentication (v0.21.1)
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log(`   ✅ Successfully authenticated as admin (v0.21.1)`);
      console.log(`   ⚠️ You're using legacy admin authentication. For v0.26.3+, migrate to _superusers collection.`);
      authMethod = 'admin';
    } catch (adminError) {
      console.log(`   ❌ Legacy admin authentication also failed: ${adminError.message}`);
      
      // Try regular user authentication as a last resort
      try {
        await pb.collection('users').authWithPassword(adminEmail, adminPassword);
        console.log(`   ⚠️ Authenticated as a regular user, not as admin/superuser`);
        console.log(`   ⚠️ This will limit your ability to manage collections`);
        authMethod = 'user';
      } catch (userError) {
        console.error(`   ❌ All authentication methods failed`);
        
        // Provide migration guidance
        if (superuserError.status === 404) {
          console.log(`\n📋 MIGRATION GUIDANCE`);
          console.log(`   It appears you're using PocketBase v0.26.3+ but the _superusers collection is not set up.`);
          console.log(`   To migrate:`);
          console.log(`   1. Access your PocketBase Admin UI at: ${pbUrl}/_/`);
          console.log(`   2. Create a new superuser with the same credentials as in your .env file`);
          console.log(`   3. Run this check script again`);
          console.log(`\n   For detailed instructions, see documentation/pocketbase-v0.26.3-upgrade-guide.md`);
        } else {
          console.log(`\n⚠️ Check your .env file to ensure POCKETBASE_USER and POCKETBASE_PASS are correct.`);
        }
        
        process.exit(1);
      }
    }
  }
  
  // Step 3: Check collections
  console.log(`\n3️⃣ Collections Check`);
  
  try {
    const collections = await pb.collections.getFullList();
    console.log(`   ✅ Successfully retrieved ${collections.length} collections`);
    
    // Check for _superusers collection (v0.26.3+)
    const hasSuperusers = collections.some(c => c.name === '_superusers');
    if (hasSuperusers) {
      console.log(`   ✅ _superusers collection exists (v0.26.3+)`);
    } else {
      console.log(`   ⚠️ _superusers collection not found`);
      if (authMethod === 'admin') {
        console.log(`   ℹ️ This is normal for PocketBase v0.21.1 which uses the legacy admin API`);
      } else {
        console.log(`   ⚠️ This is unusual for PocketBase v0.26.3+. You may need to initialize your database.`);
      }
    }
    
    // Check for user_profiles collection
    const userProfilesCollection = collections.find(c => c.name === 'user_profiles');
    if (userProfilesCollection) {
      console.log(`   ✅ user_profiles collection exists`);
      
      // Get schema details
      try {
        const schema = userProfilesCollection.schema;
        if (schema && Array.isArray(schema)) {
          console.log(`   ℹ️ user_profiles schema has ${schema.length} fields`);
          
          // Check for required user relation field
          const userRelation = schema.find(f => 
            (f.name === 'user_id' || f.name === 'user') && 
            f.type === 'relation'
          );
          
          if (userRelation) {
            console.log(`   ✅ user_profiles has a user relation field: ${userRelation.name}`);
          } else {
            console.log(`   ⚠️ user_profiles is missing a user relation field`);
          }
        } else {
          console.log(`   ⚠️ user_profiles schema is not an array or is undefined`);
        }
      } catch (schemaError) {
        console.log(`   ⚠️ Could not inspect user_profiles schema: ${schemaError.message}`);
      }
    } else {
      console.log(`   ⚠️ user_profiles collection not found`);
      console.log(`   ℹ️ You may need to run the initialization script`);
    }
  } catch (collectionsError) {
    console.error(`   ❌ Failed to retrieve collections: ${collectionsError.message}`);
    console.error(`   ⚠️ This may indicate insufficient permissions or authentication issues`);
  }
  
  // Step 4: Version Assessment and Recommendations
  console.log(`\n4️⃣ Version Assessment`);
  
  if (authMethod === 'superuser') {
    console.log(`   ✅ You are correctly set up for PocketBase v0.26.3+`);
  } else if (authMethod === 'admin') {
    console.log(`   ⚠️ You are using legacy admin authentication (v0.21.1)`);
    console.log(`   ℹ️ To upgrade to v0.26.3+:`);
    console.log(`   1. Access your PocketBase Admin UI at: ${pbUrl}/_/`);
    console.log(`   2. Create a superuser with the same credentials`);
    console.log(`   3. Update your code to use the _superusers collection for auth`);
    console.log(`   4. Refer to documentation/pocketbase-v0.26.3-upgrade-guide.md for details`);
  } else if (authMethod === 'user') {
    console.log(`   ⚠️ You are authenticated as a regular user, not admin/superuser`);
    console.log(`   ⚠️ This will limit your ability to manage collections and users`);
  } else {
    console.log(`   ❌ No successful authentication method identified`);
  }
  
  console.log(`\n✅ PocketBase check completed`);
}

// Run the check
checkPocketBase()
  .catch(error => {
    console.error(`\n❌ Unexpected error during PocketBase check: ${error.message}`);
    process.exit(1);
  }); 