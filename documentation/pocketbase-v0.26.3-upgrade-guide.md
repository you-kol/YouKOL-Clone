# PocketBase v0.26.3 Upgrade Guide

This document provides a comprehensive guide for upgrading from PocketBase v0.21.1 to v0.26.3, with special focus on the critical change that moves admins to the `_superusers` collection.

## Breaking Changes Overview

PocketBase v0.26.3 introduces several breaking changes from v0.21.1:

1. **Admin API Migration to _superusers Collection**: 
   - Admins are now regular auth collection records in the `_superusers` collection
   - The `/api/admins/*` endpoints are removed
   - Admin authentication now uses the collection endpoints

2. **HTTP Client Changes**:
   - `axios` has been replaced with a custom HTTP client
   - `pb.axios.defaults.timeout` → `pb.http.setTimeout(timeout)`

3. **Authentication Method Changes**:
   - Auth endpoints now work the same for both email and username

4. **Enhanced Error Handling**:
   - Error responses include more detailed information

## Admin to _superusers Migration

The most significant change is that admin users are now stored in a regular auth collection called `_superusers`. This means:

1. You must authenticate with `pb.collection('_superusers').authWithPassword()` instead of `pb.admins.authWithPassword()`
2. All admin-specific operations now use the standard collection API
3. The `/api/admins/*` endpoints have been removed

### Migration Steps

1. **Update PocketBase Package**: 
   ```json
   "pocketbase": "^0.26.3"
   ```

2. **Create Superuser Account**:
   - Access your PocketBase admin UI (`http://your-pb-url/_/`)
   - The first time you run PocketBase v0.26.3, it will create a `_superusers` collection
   - Create a new superuser with the same credentials as your previous admin account

3. **Update Authentication Code**:
   ```javascript
   // OLD (v0.21.1)
   await pb.admins.authWithPassword(email, password);
   
   // NEW (v0.26.3)
   await pb.collection('_superusers').authWithPassword(email, password);
   ```

4. **Implement Fallback Authentication**:
   For smoother migration, implement a fallback mechanism that tries both methods:
   ```javascript
   // OLD (v0.21.1)
   await pb.admins.authWithPassword(email, password);
   
   // NEW (v0.26.3)
   try {
     await pb.collection('_superusers').authWithPassword(email, password);
   } catch (err) {
     await pb.admins.authWithPassword(email, password);
     console.warn('Using legacy admin authentication. Please migrate to _superusers.');
   }
   ```

## HTTP Client Changes

The HTTP client has been completely rewritten:

1. **Timeout Configuration**:
   ```javascript
   // OLD (v0.21.1)
   pb.axios.defaults.timeout = timeout;
   
   // NEW (v0.26.3)
   pb.http.setTimeout(timeout);
   ```

2. **Request Cancellation**:
   ```javascript
   // OLD (v0.21.1)
   pb.autoCancellation(false);
   
   // NEW (v0.26.3) - remains the same
   pb.autoCancellation(false);
   ```

## Authentication Changes

1. **Username and Email Authentication**:
   In v0.26.3, username and email authentication work the same way:
   ```javascript
   // Both work the same now
   await pb.collection('users').authWithPassword(emailOrUsername, password);
   ```

2. **OAuth2 Authentication**:
   The OAuth2 authentication methods remain largely the same.

## Implementation Details

Our updated implementation includes several changes:

1. **PocketBase Service** (`server/services/pocketbase.js`):
   - Updated HTTP client configuration
   - Implemented _superusers authentication with fallbacks
   - Added new methods for _superusers management

2. **Initialization Script** (`setup/initialize-pocketbase.js`):
   - Now tries _superusers authentication first
   - Falls back to admin and user authentication if needed
   - Creates superuser accounts instead of admin accounts

3. **Test Scripts**:
   - Updated to check for _superusers collection
   - Provides guidance for migrating to v0.26.3

## Fallback Strategy

Our implementation includes a comprehensive fallback strategy:

1. First tries _superusers collection authentication (v0.26.3+)
2. If that fails, tries legacy admin authentication
3. If both fail, tries regular user authentication
4. Provides detailed error messages and migration guidance

## Verifying the Upgrade

After upgrading:

1. Run `npm run check-pb` to verify the PocketBase version and authentication
2. Check for the existence of the _superusers collection
3. Verify that your superuser account has the correct permissions

## Troubleshooting

Common issues during the upgrade process:

1. **404 on admin endpoints**: This is expected as these endpoints have been replaced with collection endpoints.
   - Solution: Use `pb.collection('_superusers')` instead of `pb.admins`

2. **Authentication failures**: May occur if the _superusers collection is not properly set up.
   - Solution: Manually create a superuser account via the admin UI

3. **HTTP client errors**: Occur due to the replacement of axios with a custom client.
   - Solution: Update all HTTP client related code according to this guide

## Resources

- [Official PocketBase Documentation](https://pocketbase.io/docs/)
- [PocketBase JavaScript SDK](https://github.com/pocketbase/js-sdk)
- [PocketBase v0.23 Upgrade Guide](https://pocketbase.io/v023upgrade/jsvm/) - Contains details about the admin to superuser migration 