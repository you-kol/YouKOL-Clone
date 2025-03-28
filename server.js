const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const logger = require('./logger');

// Security enhancements
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Import the PocketBase service
const { pocketBaseService: pbService } = require('./server/services/pocketbase');

// Import session configuration
const configureSession = require('./server/middleware/session');

// Import routes
const authRoutes = require('./server/routes/auth');
const profileRoutes = require('./server/routes/profile');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// API Keys - Securely loaded from environment variables
const DEEP_IMAGE_API_KEY = process.env.DEEP_IMAGE_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY;

// Log API key status (truncated for security)
logger.info('🔑 API Key Configuration:');
logger.info(`Deep Image API Key: ${DEEP_IMAGE_API_KEY ? DEEP_IMAGE_API_KEY.substring(0, 8) + '...' : 'NOT SET ⚠️'}`);
logger.info(`Grok API Key: ${GROK_API_KEY ? GROK_API_KEY.substring(0, 8) + '...' : 'NOT SET ⚠️'}`);

// Setup CORS for cross-origin requests
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['*']; // Default to allow all origins if not specified

logger.info('📋 CORS Configuration:');
if (allowedOrigins.includes('*')) {
  logger.warn('⚠️ All origins allowed - this is not recommended for production');
  logger.info('\nTo configure allowed origins, update the ALLOWED_ORIGINS variable in your .env file');
} else {
  logger.info('✅ CORS configured to allow only the following origins:');
  allowedOrigins.forEach(origin => logger.info(`  - ${origin}`));
}

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure CORS middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Allow cookies to be sent with requests
}));

// Parse cookies
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log the incoming request
  logger.info(`📥 ${req.method} ${req.originalUrl}`, {
    requestId: req.headers['x-request-id'] || Date.now().toString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    contentType: req.headers['content-type']
  });
  
  // Intercept the response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    // Log the response (but don't log large responses or sensitive data)
    logger.info(`📤 ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      requestId: req.headers['x-request-id'] || Date.now().toString(),
      statusCode: res.statusCode,
      duration: duration,
      contentLength: res.get('Content-Length') || (body ? body.length : 0),
    });
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Configure session middleware
app.use(configureSession());

// Security enhancements: Apply helmet for HTTP security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net', 'cdn.tailwindcss.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'cdn.jsdelivr.net'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
  // Additional security headers
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' }, // Prevent clickjacking
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }, // Restrict Adobe Flash and PDFs
  expectCt: {
    enforce: true,
    maxAge: 86400 // 1 day in seconds
  }
}));

// CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
});

// Rate limiting middleware
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Parse JSON body
app.use(express.json({ limit: '10mb' }));  // Increased limit for base64 images

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files temporarily for the Deep Image API
app.use('/temp-uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// Serve static files from the current directory (for development)
app.use(express.static(__dirname));

// Register authentication routes
app.use('/api/auth/login', authLimiter); // Apply stricter rate limiting to login
app.use('/api/auth/register', authLimiter); // Apply stricter rate limiting to registration
app.use('/api/auth/password-reset', authLimiter); // Apply stricter rate limiting to password reset

// CSRF token endpoint - must be before protected routes
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ 
    success: true,
    csrfToken: req.csrfToken() 
  });
});

// Apply CSRF protection to authentication and profile routes
app.use('/api/auth', csrfProtection, authRoutes);
app.use('/api/profile', csrfProtection, apiLimiter, profileRoutes);

// Import authentication middleware if needed for protected routes
const { attachUserData, requireAuth } = require('./server/middleware/auth');

// Attach user data to request if authenticated
app.use(attachUserData);

// Serve index.html at the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Enhanced endpoint for image enhancement that proxies to Deep Image API
app.post('/api/enhance-image', csrfProtection, async (req, res) => {
  try {
    // Check if we have base64 image data
    if (req.body && req.body.image_base64) {
      logger.info('Received base64 image data');
      
      // Create a temporary file from the base64 data
      const imageData = req.body.image_base64;
      // Remove data URL prefix if it exists
      const base64Data = imageData.includes('base64,') ? imageData.split('base64,')[1] : imageData;
      
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Create a temporary file
      const tempFilePath = path.join(uploadDir, `temp-${Date.now()}.jpg`);
      fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
      logger.info(`Created temporary file from base64 data: ${tempFilePath}`);
      
      // Set the file path for the API call
      req.tempFilePath = tempFilePath;
      await handleDeepImageAPICall(req, res);
    } 
    // Check if we have imageUrl in the request body
    else if (req.body && req.body.imageUrl) {
      logger.info('Received image URL via JSON');
      await handleDeepImageAPICall(req, res);
    } else {
      // For form uploads, use multer
      upload.single('image')(req, res, async function(err) {
        if (err) {
          logger.error('Error in file upload:', err);
          return res.status(400).json({ 
            status: 'error', 
            message: err.message 
          });
        }
        
        if (!req.file) {
          logger.error('No file uploaded, no image_base64, and no imageUrl in request body');
          return res.status(400).json({ 
            status: 'error', 
            message: 'Please provide either imageUrl, image_base64, or upload a file' 
          });
        }
        
        logger.info('File uploaded successfully:', req.file.path);
        
        // Set the file path for the API call
        req.tempFilePath = req.file.path;
        await handleDeepImageAPICall(req, res);
      });
    }
  } catch (error) {
    logger.error('Error in enhance-image endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error processing the image',
      error: error.message
    });
  }
});

// Function to handle the actual API call to Deep Image
async function handleDeepImageAPICall(req, res) {
  try {
    logger.info('Starting enhancement workflow with Deep Image API...');
    const apiKey = DEEP_IMAGE_API_KEY;
    const apiEndpoint = 'https://api.deep-image.ai/rest_api/process_result';
    
    // Step 1: Get or generate an image URL (this is the simplified workflow)
    let imageUrl;
    let tempFilePath;
    
    // If we already have an image URL in the request, use it directly
    if (req.body && req.body.imageUrl) {
      logger.info('Using provided image URL:', req.body.imageUrl);
      imageUrl = req.body.imageUrl;
    }
    // If we have a local file (either uploaded or created from base64), we need to convert it to a URL
    else if (req.tempFilePath) {
      logger.info('Converting local file to base64 for Deep Image API:', req.tempFilePath);
      tempFilePath = req.tempFilePath;
      
      // Read the file and convert to base64
      const fileBuffer = fs.readFileSync(req.tempFilePath);
      const base64Data = fileBuffer.toString('base64');
      
      // Create a base64 URL in the format expected by Deep Image API
      // Note: They expect "base64," prefix rather than full data URL format
      imageUrl = `base64,${base64Data}`;
      
      logger.info('Created base64 string for Deep Image API');
    } else {
      throw new Error('No valid image source provided (no URL or file)');
    }
    
    // Step 2: Prepare the JSON payload for the API call (following the documentation example)
    const jsonPayload = {
      url: imageUrl,
      max_length: 4096,
      enhancements: [
        "face_enhance"
      ],
      face_enhance_parameters: {
        type: "beautify-real",
        level: 0.8,
        smoothing_level: 0.1
      },
      output_format: 'jpg'
    };
    
    // Step 3: Make the API call using JSON (the documented approach)
    logger.info('Sending image data to Deep Image API via JSON payload');
    const response = await axios.post(apiEndpoint, jsonPayload, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    // Step 4: Process the API response
    logger.info('Received response from Deep Image API with status:', response.status);
    logger.info('Response details:', JSON.stringify(response.data, null, 2));
    
    // Handle the response
    if (response.data.result_url) {
      logger.info('Found image URL in result_url, fetching:', response.data.result_url);
      const imageResponse = await axios.get(response.data.result_url, {
        responseType: 'arraybuffer'
      });
      
      // Convert to base64
      const enhancedImageData = Buffer.from(imageResponse.data, 'binary').toString('base64');
      logger.info('Successfully fetched and converted enhanced image');
      
      // Return the enhanced image data
      res.json({
        status: 'success',
        result: {
          image_base64: enhancedImageData,
          response_data: response.data
        }
      });
    } else {
      logger.error('No result_url in API response:', response.data);
      throw new Error('No enhanced image URL in API response');
    }
    
    // Clean up temporary file after use
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
        logger.info('Temporary file deleted:', tempFilePath);
      } catch (unlinkError) {
        logger.error('Error deleting temporary file:', unlinkError);
      }
    }
  } catch (error) {
    logger.error('Error calling Deep Image API:', error);
    
    // Log detailed error information
    if (error.response) {
      logger.error('Response status:', error.response.status);
      logger.error('Response headers:', error.response.headers);
      logger.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Send detailed error response
    res.status(error.response?.status || 500).json({
      status: 'error',
      message: 'Failed to enhance image',
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}

// Add Grok Vision API endpoint for caption generation
app.post('/api/generate-caption', async (req, res) => {
  try {
    // Check if Grok API key exists
    if (!GROK_API_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'Grok API key not configured. Please set GROK_API_KEY in your .env file.'
      });
    }
    
    // Check for media data in request
    if (!req.body.mediaItems || !Array.isArray(req.body.mediaItems) || req.body.mediaItems.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Request must include mediaItems array with at least one image'
      });
    }
    
    // Create message content with text prompt and images
    const messageContent = [
      {
        type: "text",
        text: req.body.prompt || "Generate a creative, engaging, and social media friendly caption for this post. The caption should be short but catchy, suitable for social media, and should capture the essence of all the image(s)/video(s) into one caption."
      }
    ];
    
    // Add all images to message content
    req.body.mediaItems.forEach(media => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: `data:${media.type || 'image/jpeg'};base64,${media.data}`,
          detail: "high"
        }
      });
    });
    
    // Create request for Grok Vision API
    const requestData = {
      model: "grok-2-vision-latest",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ]
    };
    
    logger.info('Sending request to Grok Vision API...');
    
    // Call Grok API with X.AI endpoint
    const response = await axios.post('https://api.x.ai/v1/chat/completions', {
      ...requestData
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      }
    });
    
    // Check for valid response
    if (!response.data.choices || !response.data.choices[0]?.message?.content) {
      logger.error('Invalid response format from Grok API:', response.data);
      return res.status(500).json({
        status: 'error',
        message: 'Invalid response format from Grok API'
      });
    }
    
    logger.info('Caption generated successfully');
    
    // Return the generated caption
    res.json({
      status: 'success',
      result: {
        caption: response.data.choices[0].message.content.trim()
      }
    });
    
  } catch (error) {
    logger.error('Error in generate-caption endpoint:', error);
    
    let statusCode = 500;
    let errorMessage = 'Server error generating caption';
    
    // Handle different error types
    if (error.response) {
      statusCode = error.response.status;
      errorMessage = `Grok API error: ${error.response.status} ${error.response.statusText}`;
      logger.error('Grok API response:', error.response.data);
    }
    
    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Test endpoint for the Deep Image API integration
app.get('/api/test-deep-image', (req, res) => {
  res.json({
    status: 'success',
    message: 'Deep Image API proxy endpoint is ready',
    instructions: 'POST to /api/enhance-image with image_base64 in the request body or a file upload with name "image"'
  });
});

// Test endpoint for the Grok API integration
app.get('/api/test-grok', (req, res) => {
  // Check if API key is configured
  if (!GROK_API_KEY) {
    return res.status(200).json({
      status: 'warning',
      message: 'Grok API endpoint is configured but API key is missing',
      instructions: 'Add GROK_API_KEY to your .env file'
    });
  }
  
  res.json({
    status: 'success',
    message: 'Grok Vision API proxy endpoint is ready',
    instructions: 'POST to /api/generate-caption with mediaItems array containing image data'
  });
});

// Add PocketBase health check endpoint
app.get('/api/health/pocketbase', async (req, res) => {
  if (await pbService.isHealthy()) {
    return res.status(200).json({ status: 'ok', message: 'PocketBase is healthy' });
  }
  return res.status(503).json({ status: 'error', message: 'PocketBase is not responding' });
});

// Authentication middleware
function authenticatedOnly(req, res, next) {
  console.log('Authentication check', {
    hasSession: !!req.session,
    sessionUserId: req.session?.userId,
    sessionData: req.session
  });
  
  if (!req.session || !req.session.userId) {
    console.log('Authentication failed - missing session or userId');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  // Set req.user.id to the session userId for compatibility with existing code
  req.user = {
    id: req.session.userId
  };
  
  console.log('Authentication successful - user:', req.user);
  next();
}

// Get user posts
app.get('/api/posts', authenticatedOnly, csrfProtection, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Log the user ID to verify it's correct
    logger.info(`Fetching posts for user: ${userId}`);
    
    try {
      // Direct API call following PocketBase docs, using baseUrl + path
      const baseUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
      logger.info(`Using PocketBase URL: ${baseUrl}`);
      
      // Manual Axios call to PocketBase API to control the exact request format
      const response = await axios.get(`${baseUrl}/api/collections/posts/records`, {
        params: {
          page: 1,
          perPage: 50,
          sort: '-created'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Get all posts from successful API response
      const allPosts = response.data;
      logger.info(`Fetched ${allPosts.items?.length || 0} total posts`);
      
      // Filter posts by user ID on the server side
      const userPosts = {
        page: allPosts.page,
        perPage: allPosts.perPage,
        totalItems: 0,
        totalPages: allPosts.totalPages,
        items: allPosts.items?.filter(post => post.user === userId) || []
      };
      
      // Update the counts
      userPosts.totalItems = userPosts.items.length;
      userPosts.totalPages = Math.ceil(userPosts.totalItems / userPosts.perPage);
      
      logger.info(`Found ${userPosts.items.length} posts for user ${userId}`);
      
      res.json(userPosts);
    } catch (apiError) {
      // Handle API-specific error
      logger.error('PocketBase API Error:', apiError);
      
      // Try an alternative approach - use a GET request for a single user by ID
      // This avoids the filter altogether
      try {
        logger.info(`Trying alternative approach: get user with expand`);
        
        // Get the user record with expanded posts
        const userData = await pbService.pb.collection('users').getOne(userId, {
          expand: 'posts'
        });
        
        // Check if we have expanded posts data
        if (userData.expand && userData.expand.posts) {
          logger.info(`Found ${userData.expand.posts.length} posts via user expansion`);
          
          // Format response to match expected structure
          const formattedResponse = {
            page: 1,
            perPage: 50,
            totalItems: userData.expand.posts.length,
            totalPages: 1,
            items: userData.expand.posts
          };
          
          return res.json(formattedResponse);
        } else {
          // No posts found or expansion not working
          logger.info(`No posts found via expansion or expansion not supported`);
          
          // Return empty result set
          return res.json({
            page: 1,
            perPage: 50,
            totalItems: 0,
            totalPages: 0,
            items: []
          });
        }
      } catch (fallbackError) {
        logger.error('Fallback approach also failed:', fallbackError);
        throw apiError; // Rethrow original error for consistent handling
      }
    }
  } catch (error) {
    logger.error('Error fetching posts:', error);
    
    // Add more detailed error information
    const errorDetails = {
      message: error.message,
      status: error.response?.status || error.status || 500,
      data: error.response?.data || error.data || {},
      url: error.config?.url || error.url || 'unknown'
    };
    
    res.status(errorDetails.status).json({ 
      success: false, 
      message: 'Failed to fetch posts', 
      error: errorDetails 
    });
  }
});

// Create new post
app.post('/api/posts', authenticatedOnly, csrfProtection, async (req, res) => {
  // Create a safe wrapper for upload middleware
  const handleUpload = (req, res) => {
    return new Promise((resolve, reject) => {
      upload.array('images', 10)(req, res, (err) => {
        if (err) {
          logger.error('Upload error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  try {
    // First handle the file upload if any
    try {
      await handleUpload(req, res);
    } catch (uploadError) {
      logger.error('File upload failed:', uploadError);
      return res.status(400).json({ 
        success: false, 
        message: 'File upload failed', 
        error: uploadError.message 
      });
    }

    const { title, content } = req.body;
    const userId = req.user.id;
    
    logger.info(`Creating post for user: ${userId} with title: ${title}`);
    
    // Validate input
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    
    // Prepare post data
    const postData = {
      title: title,
      content: content,
      user: userId,
      images: []
    };
    
    // Handle image uploads if provided
    if (req.files && req.files.length > 0) {
      logger.info(`Processing ${req.files.length} uploaded files`);
      
      for (const file of req.files) {
        try {
          // Read the file content as base64
          const fileBuffer = fs.readFileSync(file.path);
          const base64Data = fileBuffer.toString('base64');
          
          // Create an object with image metadata and data
          const imageData = {
            fileName: file.originalname,
            mimeType: file.mimetype,
            data: `data:${file.mimetype};base64,${base64Data}`
          };
          
          logger.info(`File processed as base64: ${file.originalname}`);
          
          // Add image data to post data
          postData.images.push(imageData);
          
          // Clean up temporary file
          fs.unlinkSync(file.path);
        } catch (fileError) {
          logger.error('Error processing file:', fileError);
          // Continue with other files even if one fails
        }
      }
    }
    
    // Create the post
    logger.info('Creating post in PocketBase with data');
    const post = await pbService.pb.collection('posts').create(postData);
    
    res.status(201).json({ success: true, post });
  } catch (error) {
    logger.error('Error creating post:', error);
    
    const errorDetails = {
      message: error.message,
      status: error.status || 500,
      data: error.data || {},
    };
    
    res.status(errorDetails.status).json({ 
      success: false, 
      message: 'Failed to create post', 
      error: errorDetails 
    });
  }
});

// Update existing post
app.put('/api/posts/:id', authenticatedOnly, csrfProtection, async (req, res) => {
  // Create a safe wrapper for upload middleware
  const handleUpload = (req, res) => {
    return new Promise((resolve, reject) => {
      upload.array('images', 10)(req, res, (err) => {
        if (err) {
          logger.error('Upload error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  try {
    // First handle the file upload if any
    try {
      await handleUpload(req, res);
    } catch (uploadError) {
      logger.error('File upload failed:', uploadError);
      return res.status(400).json({ 
        success: false, 
        message: 'File upload failed', 
        error: uploadError.message 
      });
    }

    const { id } = req.params;
    const { title, content, existingImages } = req.body;
    const userId = req.user.id;
    
    logger.info(`Updating post ${id} for user ${userId}`);
    
    // Validate input
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    
    // Check if post exists and belongs to the user
    try {
      const existingPost = await pbService.pb.collection('posts').getOne(id);
      
      if (existingPost.user !== userId) {
        logger.warn(`User ${userId} attempted to update post ${id} which belongs to user ${existingPost.user}`);
        return res.status(403).json({ success: false, message: 'You do not have permission to edit this post' });
      }
      
      logger.info(`Post ${id} verified to belong to user ${userId}`);
    } catch (err) {
      logger.error(`Post ${id} not found:`, err);
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Prepare update data
    const updateData = {
      title: title,
      content: content,
      images: existingImages ? JSON.parse(existingImages) : []
    };
    
    // Handle image uploads if provided
    if (req.files && req.files.length > 0) {
      logger.info(`Processing ${req.files.length} new uploaded files for post update`);
      
      for (const file of req.files) {
        try {
          // Read the file content as base64
          const fileBuffer = fs.readFileSync(file.path);
          const base64Data = fileBuffer.toString('base64');
          
          // Create an object with image metadata and data
          const imageData = {
            fileName: file.originalname,
            mimeType: file.mimetype,
            data: `data:${file.mimetype};base64,${base64Data}`
          };
          
          logger.info(`File processed as base64: ${file.originalname}`);
          
          // Add image data to update data
          updateData.images.push(imageData);
          
          // Clean up temporary file
          fs.unlinkSync(file.path);
        } catch (fileError) {
          logger.error('Error processing file:', fileError);
          // Continue with other files even if one fails
        }
      }
    }
    
    // Update the post
    logger.info(`Updating post ${id} with new data`);
    const post = await pbService.pb.collection('posts').update(id, updateData);
    
    res.json({ success: true, post });
  } catch (error) {
    logger.error('Error updating post:', error);
    
    const errorDetails = {
      message: error.message,
      status: error.status || 500,
      data: error.data || {},
    };
    
    res.status(errorDetails.status).json({ 
      success: false, 
      message: 'Failed to update post', 
      error: errorDetails 
    });
  }
});

// Delete post
app.delete('/api/posts/:id', authenticatedOnly, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    logger.info(`Attempting to delete post ${id} for user ${userId}`);
    
    // Check if post exists and belongs to the user
    try {
      const existingPost = await pbService.pb.collection('posts').getOne(id);
      
      if (existingPost.user !== userId) {
        logger.warn(`User ${userId} attempted to delete post ${id} which belongs to user ${existingPost.user}`);
        return res.status(403).json({ success: false, message: 'You do not have permission to delete this post' });
      }
      
      logger.info(`Post ${id} verified to belong to user ${userId}`);
    } catch (err) {
      logger.error(`Post ${id} not found:`, err);
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Delete the post
    await pbService.pb.collection('posts').delete(id);
    logger.info(`Post ${id} deleted successfully`);
    
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    logger.error('Error deleting post:', error);
    
    const errorDetails = {
      message: error.message,
      status: error.status || 500,
      data: error.data || {},
    };
    
    res.status(errorDetails.status).json({ 
      success: false, 
      message: 'Failed to delete post', 
      error: errorDetails 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  if (err.message === 'Only image and video files are allowed!') {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong on the server',
    error: err.message
  });
});

// Global error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Give the logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // We don't exit the process here as it's less severe
});

// Start the server
app.listen(PORT, () => {
  const interfaces = require('os').networkInterfaces();
  const addresses = [];
  
  // Get all IP addresses
  Object.keys(interfaces).forEach(interfaceName => {
    interfaces[interfaceName].forEach(interfaceData => {
      // Skip internal and non-IPv4 addresses
      if (interfaceData.internal === false && interfaceData.family === 'IPv4') {
        addresses.push(interfaceData.address);
      }
    });
  });
  
  logger.info(`\n🚀 Server running on port ${PORT}`);
  
  logger.info(`\n🌐 Access your application at:`);
  logger.info(`  http://localhost:${PORT}`);
  
  if (addresses.length > 0) {
    logger.info(`\n📱 Network access (same WiFi/LAN):`);
    addresses.forEach(address => {
      logger.info(`  http://${address}:${PORT}`);
    });
  }
  
  logger.info(`\n⚙️ Configuration tips:`);
  logger.info(`  - CORS is ${allowedOrigins.includes('*') ? 'allowing all origins' : 'restricted to specific origins'}`);
  logger.info(`  - Deep Image API ${DEEP_IMAGE_API_KEY ? 'key is configured' : 'key is MISSING'}`);
  logger.info(`  - Grok Vision API ${GROK_API_KEY ? 'key is configured' : 'key is MISSING'}`);
  logger.info(`  - The server can be configured in the .env file`);
}); 