const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pocketBaseService: pbService, pb } = require('../services/pocketbase');
const { requireAuth, attachUserData, trackLoginAttempt, resetLoginAttempts } = require('../middleware/auth');
const logger = require('../../logger');
const sanitizeHtml = require('sanitize-html');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', [
  // Validation middleware with enhanced security
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('username')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .isAlphanumeric().withMessage('Username can only contain letters and numbers')
    .trim(),
  body('passwordConfirm').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
], async (req, res) => {
  try {
    // CSRF validation is now handled by the csurf middleware
    // No need to manually check the token here
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { email, password, passwordConfirm, username } = req.body;
    
    // Register user with PocketBase
    const user = await pbService.registerUser({
      email,
      password,
      passwordConfirm,
      username
    });
    
    // Create default user profile with sanitized input
    await pbService.createUserProfile({
      user: user.id,
      display_name: sanitizeHtml(username),
      onboarding_completed: false
    });
    
    // Return success response (but don't login automatically)
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    logger.error('Registration failed', { 
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Handle specific error cases
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: 'Registration failed',
        errors: error.data
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user and create session
 * @access Public
 */
router.post('/login', [
  // Validation middleware
  body('identity')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // CSRF validation is now handled by the csurf middleware
    // No need to manually check the token here
    
    // Check for IP-based brute force protection
    if (trackLoginAttempt(req.ip)) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Please try again later.'
      });
    }
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { identity, password } = req.body;
    
    // Log authentication attempt
    logger.info('Authentication attempt', { 
      email: identity,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    try {
      // Authenticate with PocketBase - updated for v0.26.3
      const authData = await pbService.loginUser(identity, password);
      
      // Reset login attempts on successful login
      resetLoginAttempts(req.ip);
      
      // Create session
      req.session.userId = authData.record.id;
      req.session.authenticated = true;
      req.session.userAgent = req.get('User-Agent');
      req.session.ipAddress = req.ip;
      
      // Get complete user data with profile
      const userData = await pbService.getCompleteUserData(authData.record.id);
        
      // Return user data without tokens
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: userData.id,
          email: userData.email,
          username: userData.display_name || userData.email.split('@')[0], // Use display_name as username
          displayName: userData.display_name,
          isOnboarded: userData.onboarding_completed || false
        }
      });
    } catch (error) {
      // Handle errors from the authentication service
      logger.error('Login failed', { 
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Handle specific error cases
      if (error.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          message: 'Login failed: User not found',
          errors: [{ msg: 'The email you entered doesn\'t exist in our system' }]
        });
      } else if (error.message.includes('Password error') || error.message.includes('Invalid password')) {
        return res.status(400).json({
          success: false,
          message: 'Login failed: Invalid password',
          errors: [{ msg: 'The password you entered is incorrect' }]
        });
      } else if (error.data?.password?.code === 'validation_required' || 
                error.data?.identity?.code === 'validation_required') {
        return res.status(400).json({
          success: false,
          message: 'Login failed: Missing required fields',
          errors: error.data ? [error.data] : [{ msg: 'Email and password are required' }]
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Login failed: Invalid credentials',
          errors: error.data ? [error.data] : [{ msg: 'Invalid login credentials' }]
        });
      }
    }
  } catch (error) {
    logger.error('Unexpected error during login', { 
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.',
      devError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user and destroy session
 * @access Private
 */
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      logger.error('Failed to destroy session', { error: err.message });
      return res.status(500).json({
        success: false,
        message: 'Logout failed. Please try again.'
      });
    }
    
    // Clear the session cookie
    res.clearCookie('youkol_session');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

/**
 * @route GET /api/auth/status
 * @desc Check if user is authenticated
 * @access Public
 */
router.get('/status', attachUserData, (req, res) => {
  if (req.user) {
    // User is authenticated and data is attached
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    // User is not authenticated
    res.json({
      authenticated: false
    });
  }
});

/**
 * @route POST /api/auth/password-reset/request
 * @desc Request password reset
 * @access Public
 */
router.post('/password-reset/request', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { email } = req.body;
    
    // Request password reset from PocketBase
    await pbService.requestPasswordReset(email);
    
    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    logger.error('Password reset request failed', { error: error.message });
    
    // Don't reveal if the email exists or not
    res.json({
      success: true,
      message: 'If the email exists, a password reset link will be sent'
    });
  }
});

/**
 * @route POST /api/auth/password-reset/confirm
 * @desc Confirm password reset
 * @access Public
 */
router.post('/password-reset/confirm', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('passwordConfirm').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { token, password, passwordConfirm } = req.body;
    
    // Confirm password reset with PocketBase
    await pbService.confirmPasswordReset(token, password, passwordConfirm);
    
    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error('Password reset confirmation failed', { error: error.message });
    
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        errors: error.data
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again later.'
    });
  }
});

/**
 * @route POST /api/auth/admin/login
 * @desc Authenticate as admin or superuser with PocketBase
 * @access Public
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let authData;
    let method = '';

    try {
      // Try v0.26.3+ superuser authentication first
      authData = await pb.collection('_superusers').authWithPassword(email, password);
      method = 'superuser';
    } catch (superuserError) {
      // If superuser auth fails, try v0.21.1 admin authentication
      try {
        authData = await pb.admins.authWithPassword(email, password);
        method = 'admin';
        logger.warn('Using legacy admin authentication. Consider upgrading to _superusers.');
      } catch (adminError) {
        // Both methods failed
        throw new Error(superuserError.message || adminError.message || 'Authentication failed');
      }
    }
    
    // Return successful response with token and user data
    return res.json({
      token: authData.token,
      user: authData.record,
      method
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    return res.status(400).json({ 
      error: error.message || 'Authentication failed',
      details: error.data
    });
  }
});

/**
 * @route GET /api/auth/refresh
 * @desc Refresh the current authentication token
 * @access Public
 */
router.get('/refresh', async (req, res) => {
  try {
    // Check if auth store has a valid token
    if (!pb.authStore.isValid) {
      return res.status(401).json({ error: 'No valid authentication token' });
    }

    // Return current auth data
    return res.json({
      token: pb.authStore.token,
      user: pb.authStore.model
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router; 