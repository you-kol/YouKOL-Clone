# User Content Management

## Overview
This document outlines the implementation plan for the User Content Management feature, which allows users to view and edit their previously created content. This feature enhances user experience by providing a centralized location for content management and enables users to save their work for future editing.

## Feature Requirements

### New UI Components
1. **Posts Button**
   - Location: Home page header section
   - Purpose: Navigation to user's posts page
   - Visibility: Only shown to authenticated users

2. **User Posts Page**
   - Purpose: Display all user-created posts
   - Features:
     - Post listing with thumbnails
     - Edit functionality for existing posts
     - Create new post option
     - Sort and filter capabilities

### User Flow
1. **Authentication**
   - Users must first authenticate on the home screen
   - After authentication, they gain access to all features

2. **Content Creation Options**
   - **Camera**: Open device camera to capture new content (unchanged)
   - **Gallery**: Renamed from "Upload" - access device photo gallery
   - **My Posts**: Access previously saved posts

3. **Post Creation Flow**
   - From Camera/Gallery: Users select/capture images → Create post page → Save post
   - From My Posts: Users can create a new blank post without images initially
   - Saved posts appear in the User Posts page for later access and editing

4. **Post Management**
   - Users can edit existing posts
   - Users can delete unwanted posts
   - Users can create new posts from the Posts page

### Technical Implementation

#### Frontend Changes
1. **Navigation Button**
   - Add "My Posts" button to the header navigation menu
   - Rename "Upload" button to "Gallery" 
   - Use consistent styling with other UI elements
   - Implement visibility toggle based on authentication state

2. **Posts Page Implementation**
   - Create new Alpine.js state for posts management
   - Implement responsive grid layout for post display
   - Add post editing interface with form validation
   - Create "New Post" functionality with blank post option

3. **Post Creation Flow**
   - Add "Save Post" option to the existing image enhancement workflow
   - Create post with selected/captured media
   - Allow users to add title and description before saving

#### Backend Requirements
1. **API Endpoints**
   - `GET /api/posts` - Retrieve user's posts
   - `POST /api/posts` - Create new post
   - `PUT /api/posts/:id` - Update existing post
   - `DELETE /api/posts/:id` - Delete post

2. **Data Model**
   - Utilize existing PocketBase collections
   - Ensure proper relations and permissions

## Implementation Plan

### Phase 1: UI Updates and Basic Structure
1. **UI Component Updates**
   - Rename "Upload" button to "Gallery"
   - Add "My Posts" button to the header navigation
   - Create posts listing page with responsive grid layout

2. **Post Management State**
   - Add new Alpine.js state for post management
   - Implement basic view functionality for posts page
   - Add loading states and empty state UI

### Phase 2: Post Creation Integration
1. **Post Creation from Capture/Gallery**
   - Add save functionality to existing image enhancement workflow
   - Create post form with title and description fields
   - Implement post save functionality

2. **Blank Post Creation**
   - Add "New Post" button on posts page
   - Implement blank post creation functionality
   - Create image upload capability for blank posts

### Phase 3: Post Management Features
1. **Post Editing**
   - Develop post editing interface
   - Implement form validation and error handling
   - Add image addition/removal capabilities

2. **Post Deletion**
   - Add post deletion functionality
   - Implement confirmation dialogs
   - Handle deletion success/error states

### Phase 4: Backend Integration
1. **Data Model and API**
   - Create/update PocketBase collections
   - Implement API endpoints
   - Add authentication and permission checks

2. **Data Persistence and Security**
   - Connect frontend to backend APIs
   - Implement CSRF protection
   - Add error handling and notifications

## User Experience Flow

1. **Home Screen (Authenticated)**
   - User sees three main options:
     - Camera button: Opens device camera
     - Gallery button: Opens device gallery
     - My Posts: Opens posts management page (via user menu)

2. **Post Creation Routes**
   - **Route A**: Camera/Gallery → Image selection → Image enhancement → Save Post form → My Posts page
   - **Route B**: My Posts → New Post button → Blank post form → Add images → Save → My Posts page

3. **Post Management**
   - User views all saved posts in a grid layout
   - User can edit any post by selecting it
   - User can delete posts with confirmation
   - User can create new blank posts

## Detailed Implementation Steps

### Step 1: Update Home Screen UI
1. Rename "Upload" button to "Gallery"
2. Update UI styles and icons
3. Add user menu with "My Posts" option
4. Implement authentication-based visibility

### Step 2: Create Posts Page Structure
1. Create modal/page layout for posts view
2. Implement responsive grid for post display
3. Add empty state and loading indicators
4. Create basic navigation and header

### Step 3: Implement Save Post Functionality
1. Add save option to image enhancement workflow
2. Create post form with title and description
3. Implement local storage for draft posts
4. Add success/error notifications

### Step 4: Develop Post Management UI
1. Create post editing interface
2. Implement post deletion with confirmation
3. Add "New Post" button and blank post form
4. Develop image upload for existing posts

### Step 5: Backend Implementation
1. Create/modify PocketBase collections for posts
2. Implement API endpoints with proper validation
3. Add authentication middleware and security checks
4. Create file handling for post images

### Step 6: Connect Frontend and Backend
1. Update API calls in frontend code
2. Implement proper error handling
3. Add loading states and progress indicators
4. Test all flows with real data

### Step 7: Testing and Refinement
1. Test all user flows and edge cases
2. Optimize performance for large post collections
3. Refine UI based on feedback
4. Fix bugs and issues

## Design Guidelines

- Maintain consistency with existing UI components
- Follow the established color scheme
- Ensure mobile responsiveness
- Implement appropriate loading states and error messages
- Use existing button and card styles

## Security Considerations

- Implement proper authorization checks
- Apply CSRF protection on all state-changing operations
- Validate user ownership of posts before allowing edits
- Sanitize user input to prevent XSS attacks
- Implement rate limiting for post creation/editing 