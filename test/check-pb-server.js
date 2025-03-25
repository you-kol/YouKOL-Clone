// test/check-pb-server.js
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

async function checkPbServer() {
  const url = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
  console.log(`Checking PocketBase server at ${url}...`);
  
  try {
    // Check if server is responding
    const healthResponse = await axios.get(`${url}/api/health`);
    console.log('✅ Server is up and running!');
    console.log('Health check response:', healthResponse.data);
    
    // Check if setup is needed
    try {
      const collectionsResponse = await axios.get(`${url}/api/collections`);
      console.log('✅ Collections endpoint accessible');
      console.log(`Found ${collectionsResponse.data?.items?.length || 0} collections`);
    } catch (collectionsError) {
      console.log('❌ Collections endpoint error:', collectionsError.message);
      if (collectionsError.response) {
        console.log('Status:', collectionsError.response.status);
        console.log('Response:', collectionsError.response.data);
      }
      
      if (collectionsError.response?.status === 401) {
        console.log('\nServer requires authentication. Attempting to access the /api/settings endpoint...');
        
        try {
          const settingsResponse = await axios.get(`${url}/api/settings`);
          console.log('✅ Settings endpoint accessible');
          
          // If settings endpoint is accessible without auth, the server is in setup mode
          console.log('\nThe server appears to be in SETUP MODE.');
          console.log('Visit the admin UI and complete the initial setup:');
          console.log(`${url}/_/`);
        } catch (settingsError) {
          console.log('❌ Settings endpoint error:', settingsError.message);
          
          if (settingsError.response?.status === 401) {
            console.log('\nServer is configured but requires authentication.');
            console.log('Make sure your .env file has the correct credentials:');
            console.log('POCKETBASE_ADMIN_EMAIL:', process.env.POCKETBASE_ADMIN_EMAIL);
            console.log('POCKETBASE_ADMIN_PASSWORD: [hidden]');
          } else if (settingsError.response?.status === 404) {
            console.log('\nThe server is likely in setup mode.');
            console.log('Visit the admin UI and complete the initial setup:');
            console.log(`${url}/_/`);
          }
        }
      }
    }
  } catch (error) {
    console.log('❌ Server connection error:', error.message);
    console.log('\nPossible issues:');
    console.log('1. PocketBase server is not running');
    console.log('2. The URL in .env is incorrect');
    console.log('3. Network connectivity issues');
    console.log('4. Firewall blocking the connection');
    
    console.log('\nRecommendations:');
    console.log('1. Check if the PocketBase server is running');
    console.log('2. Verify the URL in .env file');
    console.log('3. Try accessing the URL in a browser');
    console.log('4. Start a local PocketBase server if needed');
  }
}

checkPbServer(); 