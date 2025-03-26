# YouKOL Clone Documentation Index

This document serves as the main entry point for all documentation related to the YouKOL Clone project.

## Project Overview

YouKOL Clone is a standalone web application that provides image enhancement capabilities through a user-friendly interface. It leverages external AI-powered image processing APIs while providing a smooth, responsive user experience.

## Core Documentation

- [Product Requirements Document](prd.md) - Core features and requirements
- [Technical Stack](tech-stack.md) - Technologies used in the project
- [Frontend Structure](frontend-structure.md) - Frontend architecture
- [Backend Structure](backend-structure.md) - Backend architecture
- [App Flow](app-flow.md) - User flow and application structure

## Authentication Implementation 

- [PocketBase Authentication Guide](pocketbase-auth-implementation-guide.md) - Comprehensive guide for server-side PocketBase authentication
- [PocketBase Update to v0.26.3](pocketbase-update-to-0.26.3.md) - Documentation for the PocketBase update to version 0.26.3

## Technical Implementation Details

- [Server-Side Implementation](server-side-implementation.md) - Detailed server implementation
- [PocketBase Authentication Steps](../temp/intermediate/pocketbase_auth_implementation_plan.md) - Step-by-step implementation plan
  - [Step 1: Setup PocketBase and Dependencies](../temp/active/step1_pocketbase_setup.md) - ✅ Completed
  - [Step 2: Create PocketBase Collections](../temp/active/step2_pocketbase_collections.md) - ✅ Completed
  - [Step 3: Implement PocketBase Service](../temp/active/step3_pocketbase_service.md) - ✅ Completed
  - [Step 4: Add Session Management](../temp/active/step4_session_management.md) - ✅ Completed

## Development Guidelines

- [Project Rules](project-rules.md) - Project-specific development rules
- [User Rules](user-rules.md) - Global user rules
- [Changelog](changelog.md) - History of changes and versions

## Getting Started

To get started with the YouKOL Clone application:

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Install dependencies with `npm install`
4. Start PocketBase:
   ```bash
   cd pocketbase_windows
   ./pocketbase.exe serve
   ```
5. Initialize PocketBase:
   ```bash
   npm run init-pb
   ```
6. Run the development server with `npm run dev`

## Implementation Status

### Completed Steps
- ✅ Step 1: Setup PocketBase and Dependencies
- ✅ Step 2: Create PocketBase Collections
- ✅ Step 3: Implement PocketBase Service
- ✅ Step 4: Add Session Management
- ✅ Step 5: Add Frontend Authentication Integration
- ✅ Step 6: Profile Management Implementation
- ✅ Step 7: Frontend Integration
- ✅ Step 8: Enhancement Preferences Feature
- ✅ Step 9: Security Enhancements

Step 3 implementation includes:
- Robust user authentication (registration, login, password reset)
- Comprehensive profile management with proper JSON handling
- Enhanced error handling and fallback mechanisms
- Automatic profile creation for users without profiles
- Optimized health checks with proper error reporting

Step 4 implementation includes:
- Server-side session storage using Express session
- Secure HTTP-only cookies with environment-specific settings
- Authentication middleware for protected routes
- Comprehensive test suite for the authentication flow
- Logout functionality with proper session cleanup

Step 9 security enhancements include:
- CSRF protection for all sensitive API endpoints (auth, profile, image enhancement)
- Proper CSRF token generation and validation
- Client-side CSRF token management for API requests
- Enhanced HTTP security headers with HSTS, CSP, and clickjacking protection
- User data caching for improved authentication performance
- Comprehensive request logging for monitoring and debugging
- Automated security audit tool for vulnerability detection
- Rate limiting with differentiated thresholds for sensitive endpoints
- Brute force protection with IP-based tracking

### In Progress
- Additional HTTP security headers optimization
- Rate limiting fine-tuning
- Security audit preparation

### Current Development Focus
Authentication and security implementation is now complete. The focus can now shift to feature enhancements and user experience improvements.

## Key Features

1. **Image Enhancement**: Automatic and manual enhancement of images using AI technology
2. **Media Capture & Upload**: Capture from camera or upload from device
3. **Enhancement Presets**: Save and manage enhancement settings
4. **Before/After Comparison**: Compare original and enhanced images
5. **Batch Processing**: Enhance multiple images at once
6. **User Management**: Secure authentication and user profile handling
7. **Security Features**: CSRF protection, secure cookies, and authentication middleware

## Implementation Approach

YouKOL Clone uses a server-side approach for authentication and data management:

```
Client (Browser) <---> Node.js Server <---> PocketBase
```

This architecture enhances security by:
- Keeping authentication tokens and sensitive operations server-side
- Using session-based authentication with secure cookies
- Preventing direct client access to the database
- Centralizing business logic on the server

## External Resources

- [Deep Image API Documentation](https://deep-image.ai/docs)
- [PocketBase Documentation](https://pocketbase.io/docs)
- [Alpine.js Documentation](https://alpinejs.dev/start-here)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Authentication System Documentation

- [PocketBase Authentication Implementation Guide](pocketbase-auth-implementation-guide.md)
- [Server-Side Authentication Implementation](server-side-implementation.md)

## Feature Documentation

- [Enhancement Preferences Feature](../temp/active/enhancement_preferences_implementation_guide.md)

## API Documentation

- [Authentication API Endpoints](auth-api-endpoints.md)
- [Profile API Endpoints](profile-api-endpoints.md)

## Security Documentation

- [Security Best Practices](security-best-practices.md)
- [CSRF Protection Implementation](csrf-protection.md)

## User Experience

- [Onboarding Flow](onboarding-flow.md)
- [User Profile Management](user-profile-management.md)

# PocketBase v0.26.3 Migration Index

This document serves as an index for all files and changes related to the PocketBase v0.26.3 upgrade.

## Documentation Files

- [PocketBase v0.26.3 Upgrade Guide](./pocketbase-v0.26.3-upgrade-guide.md) - Comprehensive guide on breaking changes and migration strategies
- [Migration Instructions](./migration-instructions.md) - Step-by-step instructions for completing the manual steps of the migration

## Updated Files

### Core Service Files

1. **`server/services/pocketbase.js`**
   - Added support for both v0.26.3+ and v0.21.1 authentication methods
   - Updated HTTP client configuration to work with both versions
   - Added helper functions for superuser management
   - Improved error handling with specific error messages

2. **`setup/initialize-pocketbase.js`**
   - Complete rewrite to handle both versions
   - Added support for creating and updating collections
   - Enhanced error handling and user feedback
   - Version-specific guidance during initialization

3. **`test/check-pocketbase.js`**
   - Comprehensive diagnostic tool for checking PocketBase connection
   - Tests multiple authentication methods
   - Verifies collection existence and schema
   - Provides detailed migration guidance

4. **`server/routes/auth.js`**
   - Updated to support both superuser and admin authentication
   - Added support for v0.26.3 collections
   - Improved error handling and user feedback
   - Added complete set of authentication endpoints

### Configuration Files

1. **`.env`**
   - Updated with correct credential variable names for v0.26.3
   - Added backward compatibility for v0.21.1
   - Added clear comments for each configuration option

## Summary of Changes

The core changes to support PocketBase v0.26.3 focus on:

1. **Authentication Flow**:
   - Moving from `pb.admins` to `pb.collection('_superusers')`
   - Adding fallback mechanisms for backward compatibility
   - Improving error messages for authentication failures

2. **HTTP Client**:
   - Updating from `pb.axios.defaults.timeout` to `pb.http.setTimeout()`
   - Adding version detection for the correct method

3. **Collection Management**:
   - Supporting both admin and superuser collection creation
   - Updating schema validation and permissions
   - Adding graceful error handling for collection operations

## Testing the Migration

To verify that your migration was successful:

1. Run the diagnostic tool: `node test/check-pocketbase.js`
2. Initialize collections if needed: `node setup/initialize-pocketbase.js`
3. Verify user authentication with both regular users and superusers

## Next Steps

After successful migration:

1. Complete any manual steps outlined in [Migration Instructions](./migration-instructions.md)
2. Consider eventually removing legacy code paths once all instances are upgraded
3. Update any client applications to work with the new authentication tokens

## Active Files

The following files are currently being actively worked on:

- **user-posts-implementation.md** - Technical implementation guide for the User Content Management feature
- **user-content-management.md** - Documentation for the User Content Management feature
- **user-posts-implementation-steps.md** - Detailed step-by-step implementation plan for the User Content Management feature
