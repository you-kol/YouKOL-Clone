# CSRF Protection Implementation

This document details the Cross-Site Request Forgery (CSRF) protection implementation in the YouKOL Clone application.

## Overview

Cross-Site Request Forgery (CSRF) is a type of attack that forces authenticated users to execute unwanted actions on a web application in which they are currently authenticated. CSRF attacks specifically target state-changing requests, not theft of data, since the attacker has no way to see the response to the forged request.

## Implementation Details

### Server-Side Implementation

The application uses the `csurf` middleware package to implement CSRF protection:

```javascript
// CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
});
```

Key configuration aspects:
- **HTTP-only cookies**: Prevents client-side JavaScript from accessing the CSRF token cookie
- **SameSite strict**: Ensures cookies are only sent in same-site requests
- **Secure in production**: Cookies only sent over HTTPS in production environments

### Protected Endpoints

CSRF protection is applied to the following API endpoints:

1. **Authentication Routes**:
   ```javascript
   app.use('/api/auth', csrfProtection, authRoutes);
   ```

2. **Profile Routes**:
   ```javascript
   app.use('/api/profile', csrfProtection, apiLimiter, profileRoutes);
   ```

3. **Image Enhancement API**:
   ```javascript
   app.post('/api/enhance-image', csrfProtection, async (req, res) => { ... });
   ```

### CSRF Token Endpoint

A dedicated endpoint is provided for fetching CSRF tokens:

```javascript
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ 
    success: true,
    csrfToken: req.csrfToken() 
  });
});
```

This endpoint allows the client to obtain a valid CSRF token before making state-changing requests.

### Client-Side Implementation

#### Token Retrieval

The frontend fetches CSRF tokens using the following method:

```javascript
async fetchCsrfToken() {
  try {
    console.log('Fetching CSRF token...');
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch CSRF token:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    if (data.success) {
      console.log('CSRF token fetched successfully');
      this.csrfToken = data.csrfToken;
      
      // Store in localStorage for persistence across page loads
      localStorage.setItem('csrfToken', data.csrfToken);
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    
    // Try to get token from localStorage as fallback
    const storedToken = localStorage.getItem('csrfToken');
    if (storedToken) {
      this.csrfToken = storedToken;
    }
  }
}
```

#### Token Inclusion in Requests

The token is included in the headers of all state-changing requests:

```javascript
getRequestHeaders(contentType = 'application/json') {
  const headers = {
    'Content-Type': contentType
  };
  
  if (this.csrfToken) {
    headers['X-CSRF-Token'] = this.csrfToken;
  }
  
  return headers;
}
```

This function is used in all API calls to ensure the CSRF token is included:

```javascript
const response = await fetch('/api/profile', {
  method: 'PUT',
  headers: this.getRequestHeaders(),
  body: JSON.stringify(payload),
  credentials: 'include'
});
```

## Security Considerations

1. The implementation ensures that:
   - Tokens are transmitted securely via HTTP-only cookies
   - New tokens are generated after authentication changes (login/logout)
   - All state-changing operations require a valid token

2. CSRF protection is combined with other security measures:
   - Rate limiting on sensitive endpoints
   - Input validation and sanitization
   - Content Security Policy (CSP) headers

## Recent Fixes

Several issues related to CSRF token handling were recently addressed:

1. Fixed profile update endpoint to properly validate CSRF tokens
2. Added CSRF protection to the image enhancement API
3. Improved client-side token management to ensure tokens are properly included in all requests
4. Added token pre-fetching for operations like profile updates and image enhancement

These improvements ensure that all state-changing operations are properly protected against CSRF attacks. 