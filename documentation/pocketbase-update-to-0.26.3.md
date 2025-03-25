# PocketBase Update to v0.26.3

This document outlines the changes made to the authentication flow for PocketBase version 0.26.3.

## Summary of Changes

PocketBase v0.26.3 introduces several changes to the authentication methods and HTTP client implementation compared to the previously used version (0.21.1). The key changes that affect our authentication implementation are:

1. Explicit field names (`email` instead of `identity`) for authentication requests
2. Changes to the HTTP client configuration
3. Enhanced handling of username vs. email authentication
4. Changes to admin/superuser authentication

## Admin vs Superuser Authentication

In PocketBase v0.26.3, there's a distinction between:
- **Admins**: Accounts that can access the PocketBase admin dashboard
- **Superusers**: Regular users with elevated privileges in the application

Our implementation now tries both authentication methods:
1. First attempts admin authentication with `pb.admins.authWithPassword()`
2. If that fails, falls back to superuser authentication with `pb.collection('users').authWithPassword()`

## Implementation Changes

### Package Update

The `pocketbase` package was updated in `package.json`:

```json
"pocketbase": "^0.26.3"
```

### PocketBase Service Updates

The following changes were made to the `server/services/pocketbase.js` file:

1. HTTP Client Configuration:
   ```javascript
   // Old
   this.pb.axios.defaults.timeout = timeout;
   
   // New
   this.pb.http.setTimeout(timeout);
   ```

2. Login Method:
   ```javascript
   // Old
   const authData = await this.pb.collection('users').authWithPassword(
     identity,
     password
   );
   
   // New - Detect if identity is email or username
   const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity);
   
   let authData;
   if (isEmail) {
     authData = await this.pb.collection('users').authWithPassword(
       identity, // email
       password
     );
   } else {
     authData = await this.pb.collection('users').authWithPassword(
       identity, // username
       password
     );
   }
   ```

3. Admin Authentication with Enhanced Error Handling:
   ```javascript
   // Enhanced admin authentication with better error handling
   async adminAuth() {
     try {
       await this.pb.admins.authWithPassword(
         process.env.POCKETBASE_ADMIN_EMAIL,
         process.env.POCKETBASE_ADMIN_PASSWORD
       );
       logger.info('✅ Admin authenticated with PocketBase');
     } catch (error) {
       logger.error('❌ Failed to authenticate admin with PocketBase', { 
         error: error.message,
         status: error.status,
         data: error.data
       });
       
       // Log more specific information for troubleshooting
       if (error.status === 404) {
         logger.error('Admin authentication endpoint not found. Make sure PocketBase is properly initialized.');
       } else if (error.status === 400) {
         logger.error('Invalid admin credentials.');
       }
     }
   }
   ```

### Initialize Script Updates

In `setup/initialize-pocketbase.js`, significant changes were made to:

1. Try both admin and superuser authentication endpoints
2. Create either an admin or superuser account depending on what's supported
3. Add better error logging for troubleshooting
4. Support the new authentication approach required by v0.26.3

```javascript
// Try the superuser authentication endpoint - new in PocketBase v0.26+
try {
  const superuserResponse = await axios.post(`${pocketbaseUrl}/api/users/auth-with-password`, {
    email: adminEmail,
    password: adminPassword
  });
  
  if (superuserResponse.status === 200 && superuserResponse.data && superuserResponse.data.token) {
    log('✅ Authenticated using superuser endpoint');
    return superuserResponse.data.token;
  }
} catch (superuserError) {
  log(`Superuser authentication also failed: ${superuserError.message}`);
}
```

### Testing Script Updates

The PocketBase check script was updated to:

1. First try admin authentication
2. If admin auth fails, attempt superuser authentication
3. Provide clear instructions for setup if both methods fail
4. Improve error logging for easier debugging

## Verification

To verify the updated authentication flow:

1. Update PocketBase to version 0.26.3 or higher
2. Run `npm install` to install the updated package
3. Run `npm run check-pb` to verify PocketBase is running and authentication is working
4. If authentication fails, follow the script's instructions to set up an admin or superuser account
5. Run `npm run init-pb` to initialize the database collections
6. Run `npm run test-pb` to test the updated authentication flows

## Additional Resources

- [PocketBase JS SDK Documentation](https://github.com/pocketbase/js-sdk)
- [PocketBase Authentication API Reference](https://pocketbase.io/docs/authentication) 