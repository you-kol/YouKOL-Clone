// server/services/pocketbase.js
const PocketBase = require('pocketbase/cjs');
const dotenv = require('dotenv');
const logger = require('../../logger');

dotenv.config();

// Set default values if env variables are not set
const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const pbUser = process.env.POCKETBASE_USER || '';
const pbPass = process.env.POCKETBASE_PASS || '';

// Create a PocketBase client and configure connection
const pb = new PocketBase(pbUrl);

// Configure timeout (handling both v0.21.1 and v0.26.3 methods)
const configureTimeout = (timeout = 30000) => {
  try {
    // v0.26.3+ method
    if (typeof pb.http?.setTimeout === 'function') {
      pb.http.setTimeout(timeout);
    } 
    // v0.21.1 method (fallback)
    else if (pb.axios?.defaults) {
      pb.axios.defaults.timeout = timeout;
    }
  } catch (error) {
    console.error('Error configuring timeout:', error);
  }
};

// Configure timeout
configureTimeout();

// Set auto cancelation behavior
pb.autoCancellation(false);

// Helper function to authenticate as admin/superuser
const authenticateAsAdmin = async () => {
  if (!pbUser || !pbPass) {
    throw new Error('PocketBase admin credentials are not set in the .env file');
  }

  try {
    // Try authenticating as a superuser (v0.26.3+)
    await pb.collection('_superusers').authWithPassword(pbUser, pbPass);
    console.log('Authenticated as superuser (v0.26.3+)');
    return;
  } catch (superuserError) {
    console.log('Failed to authenticate as superuser, trying legacy admin method...');
    
    try {
      // Try legacy admin auth (v0.21.1)
      await pb.admins.authWithPassword(pbUser, pbPass);
      console.log('Authenticated as admin (v0.21.1)');
      console.warn('Using legacy admin authentication. Please migrate to superuser (_superusers collection).');
      return;
    } catch (adminError) {
      console.error('Failed to authenticate as admin:', adminError);
      
      // Try to provide more helpful error message
      const errorMessage = superuserError.message || adminError.message || 'Unknown error';
      
      if (errorMessage.includes('404') || errorMessage.includes('not found') || superuserError.status === 404) {
        throw new Error('PocketBase _superusers collection not found. You may be using a newer version of PocketBase without proper setup. Please create a superuser account via the admin UI.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403') || superuserError.status === 401 || adminError.status === 403) {
        throw new Error('Invalid admin/superuser credentials. Please check your POCKETBASE_USER and POCKETBASE_PASS in the .env file.');
      } else {
        throw new Error(`Failed to authenticate: ${errorMessage}`);
      }
    }
  }
};

// Helper function to create a superuser (for v0.26.3+)
const createSuperUser = async (email, password, passwordConfirm) => {
  try {
    // Check if we need to authenticate first
    if (!pb.authStore.isValid) {
      // Try to authenticate first with existing credentials
      try {
        await authenticateAsAdmin();
      } catch (error) {
        // If authentication fails but we're creating the first superuser, proceed
        console.log('Proceeding with superuser creation without authentication...');
      }
    }
    
    // For v0.26.3+, create a superuser
    const data = {
      email,
      password,
      passwordConfirm
    };
    
    const record = await pb.collection('_superusers').create(data);
    console.log('Superuser created successfully:', record.id);
    return record;
  } catch (error) {
    console.error('Failed to create superuser:', error);
    throw error;
  }
};

// Helper function to check if the _superusers collection exists (v0.26.3+)
const checkSuperUsersCollection = async () => {
  try {
    const collections = await pb.collections.getFullList();
    return collections.some(collection => collection.name === '_superusers');
  } catch (error) {
    console.error('Error checking for _superusers collection:', error);
    return false;
  }
};

class PocketBaseService {
  constructor() {
    this.pb = pb;
    this.isConnected = false;
    
    // Initialize connection
    this.init();
  }
  
  async init() {
    try {
      // Test connection to PocketBase
      await this.pb.health.check();
      this.isConnected = true;
      logger.info('✅ PocketBase connection successful');
      
      // Try authentication if credentials are provided
      if ((process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) ||
          (process.env.POCKETBASE_SUPERUSER_EMAIL && process.env.POCKETBASE_SUPERUSER_PASSWORD)) {
        await this.authenticate();
      }
    } catch (error) {
      logger.error('❌ Failed to connect to PocketBase', { error: error.message });
      this.isConnected = false;
      
      // Retry connection
      const retryDelay = process.env.POCKETBASE_RETRY_DELAY || 5000;
      setTimeout(() => this.init(), retryDelay);
    }
  }
  
  async authenticate() {
    let isAuthenticated = false;
    
    // In v0.26.3, admins are now in the _superusers collection
    // First try authenticating with the _superusers collection
    try {
      const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
      const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
      
      logger.info('Attempting superuser authentication...');
      await this.pb.collection('_superusers').authWithPassword(email, password);
      logger.info('✅ Superuser authenticated with PocketBase');
      isAuthenticated = true;
    } catch (superuserError) {
      logger.error('❌ Superuser authentication failed', { 
        error: superuserError.message,
        status: superuserError.status,
        data: superuserError.data
      });
      
      // If _superusers authentication fails, try the legacy admin endpoint for backward compatibility
      if (process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) {
        try {
          logger.info('Attempting legacy admin authentication...');
          await this.pb.admins.authWithPassword(
            process.env.POCKETBASE_ADMIN_EMAIL,
            process.env.POCKETBASE_ADMIN_PASSWORD
          );
          logger.info('✅ Admin authenticated with PocketBase (legacy method)');
          logger.warn('You should migrate to using _superusers collection instead of admins');
          isAuthenticated = true;
        } catch (adminError) {
          logger.error('❌ Legacy admin authentication failed', { 
            error: adminError.message,
            status: adminError.status,
            data: adminError.data
          });
        }
      }
      
      // If both _superusers and admin auth fails, try users collection
      if (!isAuthenticated) {
        try {
          logger.info('Attempting regular user authentication...');
          await this.pb.collection('users').authWithPassword(email, password);
          logger.info('✅ Regular user authenticated with PocketBase');
          isAuthenticated = true;
        } catch (userError) {
          logger.error('❌ Regular user authentication failed', { 
            error: userError.message,
            status: userError.status,
            data: userError.data
          });
        }
      }
    }
    
    if (!isAuthenticated) {
      logger.error('❌ All authentication methods failed. Check your credentials and PocketBase setup.');
      logger.info('In PocketBase v0.26.3+, admin accounts are now in the _superusers collection');
    }
    
    return isAuthenticated;
  }
  
  // ========== Health Check Methods ==========
  
  /**
   * Check if PocketBase is healthy and accessible
   * @returns {Promise<boolean>} - True if healthy, false otherwise
   */
  async isHealthy() {
    try {
      logger.debug('Performing PocketBase health check');
      
      // Disable auto-cancellation for health check
      this.pb.autoCancellation(false);
      
      const result = await this.pb.health.check();
      
      // Re-enable auto-cancellation
      this.pb.autoCancellation(true);
      
      logger.debug('PocketBase health check successful', { result });
      return true;
    } catch (error) {
      logger.error('PocketBase health check failed', { 
        error: error.message,
        code: error.status || 'unknown',
        data: error.data || {}
      });
      return false;
    }
  }
  
  // ========== Authentication Methods ==========
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.passwordConfirm - Password confirmation
   * @param {string} userData.username - Username (optional in v0.26.3)
   * @returns {Promise<Object>} - Created user object
   */
  async registerUser(userData) {
    try {
      logger.info('Registering new user', { email: userData.email });
      const user = await this.pb.collection('users').create(userData);
      logger.info('User registered successfully', { id: user.id });
      return user;
    } catch (error) {
      logger.error('Failed to register user', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Authenticate a user with email/username and password
   * @param {string} identity - Email or username
   * @param {string} password - User password
   * @returns {Promise<Object>} - Authentication data with user and token
   */
  async loginUser(identity, password) {
    try {
      logger.info('Authenticating user', { identity });
      
      // Determine if the identity is an email or username
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity);
      logger.debug('Authentication attempt details', { 
        identity,
        isEmail,
        identityType: isEmail ? 'email' : 'username' 
      });
      
      // Simplify - try direct authentication first
      try {
        logger.debug('Attempting direct authentication', { identity });
        const authData = await this.pb.collection('users').authWithPassword(identity, password);
        logger.info('User authenticated successfully', { id: authData.record.id });
        return authData;
      } catch (directAuthError) {
        logger.debug('Direct authentication failed', { 
          error: directAuthError.message,
          status: directAuthError.status
        });
        
        // Try to find the user to get more information
        try {
          // If it's an email and direct auth failed, it's likely a password issue or the user doesn't exist
          if (isEmail) {
            throw directAuthError;
          }
          
          // For username auth, try to find a matching user
          logger.debug('Searching for user by listing all users');
          const allUsers = await this.pb.collection('users').getFullList();
          
          // First priority: Find users with matching username field
          let foundUser = allUsers.find(user => 
            user.username && user.username.toLowerCase() === identity.toLowerCase()
          );
          
          // Second priority: For users with undefined username, match by email prefix
          if (!foundUser) {
            foundUser = allUsers.find(user => 
              (!user.username || user.username === '') && 
              user.email.split('@')[0].toLowerCase() === identity.toLowerCase()
            );
            
            if (foundUser) {
              logger.debug('Found user by matching email prefix', {
                identity,
                email: foundUser.email,
                emailPrefix: foundUser.email.split('@')[0]
              });
            }
          }
          
          // Third priority: Try to find an exact email that equals identity@example.com
          if (!foundUser) {
            const potentialEmail = `${identity}@example.com`;
            foundUser = allUsers.find(user => 
              user.email.toLowerCase() === potentialEmail.toLowerCase()
            );
            
            if (foundUser) {
              logger.debug('Found user by constructing email', {
                identity,
                constructedEmail: potentialEmail,
                actualEmail: foundUser.email
              });
            }
          }
          
          if (foundUser) {
            logger.debug('Found user by advanced matching', {
              id: foundUser.id,
              email: foundUser.email,
              username: foundUser.username || '(undefined)'
            });
            
            // Try authenticating with the email
            logger.debug('Attempting authentication with found email', { email: foundUser.email });
            const authData = await this.pb.collection('users').authWithPassword(foundUser.email, password);
            logger.info('User authenticated successfully via email lookup', { id: authData.record.id });
            return authData;
          } else {
            logger.warn('User not found by any matching method', { identity });
            throw new Error(`User not found: ${identity}`);
          }
        } catch (fallbackError) {
          if (fallbackError.message && fallbackError.message.includes('User not found')) {
            throw fallbackError;
          }
          
          // If it's not our custom error, it's likely the original auth error
          logger.error('Authentication failed', { 
            error: fallbackError.message || directAuthError.message,
            identity
          });
          
          // Check if the error indicates invalid credentials
          if (directAuthError.status === 400) {
            throw new Error('Invalid credentials');
          }
          
          throw directAuthError;
        }
      }
    } catch (error) {
      logger.error('Login failed', { 
        error: error.message,
        status: error.status,
        identity 
      });
      
      if (error.message.includes('not found')) {
        throw new Error(`User not found: ${identity}`);
      } else if (error.message.includes('Invalid credentials')) {
        throw new Error('Authentication failed: Invalid password');
      }
      
      throw error;
    }
  }
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User object
   */
  async getUserById(userId) {
    try {
      return await this.pb.collection('users').getOne(userId);
    } catch (error) {
      logger.error('Failed to get user by ID', { userId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Request password reset for a user
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async requestPasswordReset(email) {
    try {
      logger.info('Requesting password reset', { email });
      await this.pb.collection('users').requestPasswordReset(email);
      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to request password reset', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Confirm password reset
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @param {string} passwordConfirm - Password confirmation
   * @returns {Promise<void>}
   */
  async confirmPasswordReset(token, password, passwordConfirm) {
    try {
      logger.info('Confirming password reset');
      await this.pb.collection('users').confirmPasswordReset(
        token,
        password,
        passwordConfirm
      );
      logger.info('Password reset successfully');
    } catch (error) {
      logger.error('Failed to confirm password reset', { error: error.message });
      throw error;
    }
  }
  
  // ========== Admin/Superuser Methods ==========

  /**
   * Get a superuser by ID
   * In v0.26.3, admins are now in the _superusers collection
   * @param {string} id - Superuser ID
   * @returns {Promise<Object>} - Superuser record
   */
  async getSuperuserById(id) {
    try {
      return await this.pb.collection('_superusers').getOne(id);
    } catch (error) {
      logger.error('Failed to get superuser by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find a superuser by email
   * In v0.26.3, admins are now in the _superusers collection
   * @param {string} email - Superuser email
   * @returns {Promise<Object>} - Superuser record
   */
  async findSuperuserByEmail(email) {
    try {
      return await this.pb.collection('_superusers').getFirstListItem(`email="${email}"`);
    } catch (error) {
      logger.error('Failed to find superuser by email', { email, error: error.message });
      throw error;
    }
  }
  
  // ========== User Profile Methods ==========
  
  /**
   * Create a user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} - Created profile
   */
  async createUserProfile(profileData) {
    try {
      logger.info('Creating user profile', { userId: profileData.user });
      
      // Ensure required fields are present
      const requiredProfile = {
        user: profileData.user,
        display_name: profileData.display_name || 'New User',
        onboarding_completed: typeof profileData.onboarding_completed === 'boolean' ? 
          profileData.onboarding_completed : false
      };
      
      // Add optional fields only if they have valid values (not null or undefined)
      if (profileData.bio) requiredProfile.bio = profileData.bio;
      
      // Handle usage_frequency (enum field)
      if (profileData.usage_frequency) requiredProfile.usage_frequency = profileData.usage_frequency;
      
      // Handle content_types (JSON field)
      if (profileData.content_types && profileData.content_types !== null) {
        // Ensure JSON fields are properly stringified if they're not already strings
        if (typeof profileData.content_types === 'object') {
          requiredProfile.content_types = JSON.stringify(profileData.content_types);
        } else {
          requiredProfile.content_types = profileData.content_types;
        }
      }
      
      // Handle preferences (JSON field)
      if (profileData.preferences && profileData.preferences !== null) {
        // Ensure JSON fields are properly stringified if they're not already strings
        if (typeof profileData.preferences === 'object') {
          requiredProfile.preferences = JSON.stringify(profileData.preferences);
        } else {
          requiredProfile.preferences = profileData.preferences;
        }
      }
      
      logger.debug('Creating profile with data', { profileData: requiredProfile });
      
      const profile = await this.pb.collection('user_profiles').create(requiredProfile);
      logger.info('User profile created successfully', { id: profile.id });
      return profile;
    } catch (error) {
      logger.error('Failed to create user profile', { 
        error: error.message, 
        data: error.data,
        profileData: JSON.stringify(profileData)
      });
      throw error;
    }
  }
  
  /**
   * Get a user's profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User profile
   */
  async getUserProfile(userId) {
    try {
      return await this.pb.collection('user_profiles').getFirstListItem(`user="${userId}"`);
    } catch (error) {
      logger.error('Failed to get user profile', { userId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Update a user profile
   * @param {string} profileId - Profile ID
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} - Updated profile
   */
  async updateUserProfile(profileId, profileData) {
    try {
      logger.info('Updating user profile', { profileId });
      const profile = await this.pb.collection('user_profiles').update(profileId, profileData);
      logger.info('User profile updated successfully', { id: profile.id });
      return profile;
    } catch (error) {
      logger.error('Failed to update user profile', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Update user onboarding status
   * @param {string} userId - User ID
   * @param {Object} onboardingData - Onboarding data
   * @returns {Promise<Object>} - Updated profile
   */
  async updateOnboardingStatus(userId, onboardingData) {
    try {
      logger.info('Updating onboarding status', { userId });
      
      // Get the user profile
      const profile = await this.getUserProfile(userId);
      
      // Update the profile
      return await this.updateUserProfile(profile.id, {
        ...onboardingData,
        onboarding_completed: true
      });
    } catch (error) {
      logger.error('Failed to update onboarding status', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Check if a user has completed onboarding
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Onboarding status
   */
  async hasCompletedOnboarding(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      return profile.onboarding_completed;
    } catch (error) {
      logger.error('Failed to check onboarding status', { error: error.message });
      return false;
    }
  }
  
  /**
   * Get a user's profile, creating a default one if it doesn't exist
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User profile
   */
  async getOrCreateUserProfile(userId) {
    try {
      try {
        // Try to get the existing profile
        return await this.getUserProfile(userId);
      } catch (error) {
        // If profile doesn't exist, create a default one
        if (error.status === 404) {
          logger.info('Profile not found, creating default profile', { userId });
          
          // Get the user info to use their username
          const user = await this.getUserById(userId);
          
          // Create a default profile with ONLY required fields
          // This avoids sending null values for JSON fields
          const defaultProfile = {
            user: userId,
            display_name: user.username || 'New User',
            onboarding_completed: false
          };
          
          return await this.createUserProfile(defaultProfile);
        }
        
        // For any other error, just throw it
        throw error;
      }
    } catch (error) {
      logger.error('Failed to get or create user profile', { userId, error: error.message });
      throw error;
    }
  }
  
  // ========== Custom User Methods ==========
  
  /**
   * Get complete user data (user + profile)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Complete user data
   */
  async getCompleteUserData(userId) {
    try {
      logger.info('Getting complete user data', { userId });
      
      // Get user data
      const user = await this.getUserById(userId);
      
      // Get user profile (or create if it doesn't exist)
      const profile = await this.getOrCreateUserProfile(userId);
      
      // Combine user and profile data
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        created: user.created,
        updated: user.updated,
        avatar: user.avatar,
        display_name: profile.display_name,
        bio: profile.bio,
        onboarding_completed: profile.onboarding_completed,
        usage_frequency: profile.usage_frequency,
        content_types: profile.content_types,
        preferences: profile.preferences,
        profile_id: profile.id
      };
    } catch (error) {
      logger.error('Failed to get complete user data', { userId, error: error.message });
      throw error;
    }
  }
}

// Create a singleton instance
const pocketBaseService = new PocketBaseService();

module.exports = {
  pb,
  authenticateAsAdmin,
  createSuperUser,
  checkSuperUsersCollection,
  configureTimeout,
  pocketBaseService  // Export the service instance
}; 