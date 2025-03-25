const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = 'http://localhost:3000/api'; // Change if needed

async function testAuthentication() {
  console.log('🔍 TESTING AUTHENTICATION FLOW');
  console.log('============================\n');
  
  // Step 1: Register a new user with unique credentials
  const uniqueId = Date.now();
  const userData = {
    email: `test${uniqueId}@example.com`,
    username: `test${uniqueId}`,
    password: 'Test1234!',
    passwordConfirm: 'Test1234!'
  };
  
  try {
    console.log('1️⃣ Attempting to register a new user');
    console.log(`   Email: ${userData.email}`);
    
    const registerResponse = await axios.post(`${API_URL}/auth/register`, userData);
    
    if (registerResponse.data.success) {
      console.log(`   ✅ User registered successfully with ID: ${registerResponse.data.user.id}`);
    } else {
      console.log(`   ❌ User registration failed`);
      console.log(registerResponse.data);
    }
    
    // Step 2: Test login with email
    console.log('\n2️⃣ Attempting to login with email');
    
    const loginWithEmailResponse = await axios.post(`${API_URL}/auth/login`, {
      identity: userData.email,
      password: userData.password
    });
    
    if (loginWithEmailResponse.data.success) {
      console.log(`   ✅ Login with email successful`);
      console.log(`   User ID: ${loginWithEmailResponse.data.user.id}`);
    } else {
      console.log(`   ❌ Login with email failed`);
      console.log(loginWithEmailResponse.data);
    }
    
    // Step 3: Test login with username
    console.log('\n3️⃣ Attempting to login with username');
    
    const loginWithUsernameResponse = await axios.post(`${API_URL}/auth/login`, {
      identity: userData.username,
      password: userData.password
    });
    
    if (loginWithUsernameResponse.data.success) {
      console.log(`   ✅ Login with username successful`);
      console.log(`   User ID: ${loginWithUsernameResponse.data.user.id}`);
    } else {
      console.log(`   ❌ Login with username failed`);
      console.log(loginWithUsernameResponse.data);
    }
    
    console.log('\n✅ Authentication tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Authentication test failed:');
    
    if (error.response) {
      // Server responded with an error
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Request was made but no response received
      console.error('   No response received from server. Is the server running?');
    } else {
      // Error setting up the request
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Run the tests
testAuthentication(); 