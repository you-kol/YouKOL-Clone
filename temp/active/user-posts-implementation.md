# User Content Management - Implementation Guide

This document provides a comprehensive implementation guide for the User Content Management feature, organized in a step-by-step approach for systematic development and clearer task allocation.

## Overview

The User Content Management feature allows users to:
- View and edit their previously created content
- Save content from the enhancement workflow as posts
- Create new blank posts from the My Posts page
- Edit and delete their existing posts

## Step 1: Update Home Screen UI

### 1.1: Rename "Upload" button to "Gallery"
```html
<!-- Change in index.html -->
<label 
    for="file-upload" 
    class="upload-btn w-full md:w-80 flex items-center justify-center rounded-full py-3 px-6 cursor-pointer"
>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
    </svg>
    Gallery
</label>
```

### 1.2: Add "My Posts" to User Menu
```html
<!-- Update dropdown menu in header -->
<div 
    x-show="userMenuOpen" 
    @click.away="userMenuOpen = false"
    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
>
    <!-- Add new My Posts link -->
    <a href="#" @click.prevent="showPostsView = true; userMenuOpen = false; loadUserPosts()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        My Posts
    </a>
    <!-- Existing menu items -->
    <a href="#" @click.prevent="showProfileView = true; userMenuOpen = false; loadProfileForm()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        My Profile
    </a>
    <a href="#" @click.prevent="logout(); userMenuOpen = false" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        Logout
    </a>
</div>
```

### 1.3: Add Authentication Visibility Check
```javascript
// In appState() function
// Only show these options to authenticated users
x-show="isAuthenticated"
```

## Step 2: Create Posts Page Structure

### 2.1: Add Posts View State Variables
```javascript
// Add to appState() function
showPostsView: false,
userPosts: [],
isLoadingPosts: false,
postError: null,
```

### 2.2: Create Posts View Modal
```html
<!-- Posts View -->
<div 
    x-show="showPostsView" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
>
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-xl font-semibold">My Posts</h2>
            <button @click="showPostsView = false" class="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <!-- Content -->
        <div class="p-4">
            <!-- Loading State -->
            <div x-show="isLoadingPosts" class="flex justify-center p-8">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
            
            <!-- Error State -->
            <div x-show="!isLoadingPosts && postError" class="text-center p-8">
                <div class="text-red-500 mb-4" x-text="postError"></div>
                <button @click="loadUserPosts()" class="btn btn-primary">Retry</button>
            </div>
            
            <!-- Empty State -->
            <div x-show="!isLoadingPosts && !postError && userPosts.length === 0" class="text-center p-8">
                <p class="text-gray-500 mb-4">You haven't created any posts yet</p>
                <button @click="createNewPost()" class="btn btn-primary">Create Your First Post</button>
            </div>
            
            <!-- Posts Grid -->
            <div x-show="!isLoadingPosts && !postError && userPosts.length > 0" class="space-y-4">
                <!-- Actions Bar -->
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium">Your Posts</h3>
                    <button @click="createNewPost()" class="btn btn-primary btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Post
                    </button>
                </div>
                
                <!-- Posts Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <template x-for="post in userPosts" :key="post.id">
                        <div class="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                            <!-- Post Image -->
                            <div class="h-48 bg-gray-100 overflow-hidden">
                                <img x-show="post.image" :src="post.image" alt="Post image" class="w-full h-full object-cover">
                                <div x-show="!post.image" class="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            
                            <!-- Post Content -->
                            <div class="p-4">
                                <h4 class="font-semibold mb-2 truncate" x-text="post.title"></h4>
                                <p class="text-sm text-gray-500 line-clamp-2" x-text="post.content"></p>
                                
                                <!-- Post Actions -->
                                <div class="mt-4 flex justify-between items-center">
                                    <span class="text-xs text-gray-500" x-text="formatDate(post.created)"></span>
                                    <div class="flex space-x-2">
                                        <button @click="editPost(post)" class="btn btn-sm btn-ghost text-secondary">
                                            Edit
                                        </button>
                                        <button @click="confirmDeletePost(post.id)" class="btn btn-sm btn-ghost text-red-500">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 2.3: Add Load Posts Function
```javascript
// Add to appState() function
async loadUserPosts() {
    if (!this.isAuthenticated) {
        return;
    }
    
    this.isLoadingPosts = true;
    this.postError = null;
    
    try {
        const response = await fetch('/api/posts', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        
        const data = await response.json();
        this.userPosts = data.posts;
    } catch (error) {
        console.error('Error loading posts:', error);
        this.postError = 'Failed to load your posts. Please try again.';
    } finally {
        this.isLoadingPosts = false;
    }
}
```

## Step 3: Implement Save Post Functionality

### 3.1: Add "Save" Option to Enhancement Results
```html
<!-- Add to Results State in index.html -->
<div x-show="currentState === 'results'" class="w-full flex flex-col space-y-4 items-center">
    <!-- Existing results display -->
    
    <!-- Save Post Button -->
    <button 
        x-show="isAuthenticated"
        @click="preparePostSave()" 
        class="btn btn-secondary w-full md:w-80"
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Save to My Posts
    </button>
</div>
```

### 3.2: Create Post Save Form
```html
<!-- Add to index.html -->
<!-- Post Save Form -->
<div 
    x-show="showPostSaveForm" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
>
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-xl font-semibold">Save Post</h2>
            <button @click="cancelPostSave()" class="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <!-- Form -->
        <form @submit.prevent="savePost()" class="p-4">
            <!-- Title -->
            <div class="mb-4">
                <label for="post-title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                    type="text" 
                    id="post-title" 
                    x-model="postFormData.title" 
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    required
                >
            </div>
            
            <!-- Content -->
            <div class="mb-4">
                <label for="post-content" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                    id="post-content" 
                    x-model="postFormData.content" 
                    rows="4" 
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    required
                ></textarea>
            </div>
            
            <!-- Preview -->
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Media Preview</label>
                <div class="flex flex-wrap gap-2">
                    <template x-for="(file, index) in currentSaveFiles" :key="index">
                        <div class="relative h-20 w-20 rounded overflow-hidden border border-gray-200">
                            <img :src="URL.createObjectURL(file)" class="h-full w-full object-cover">
                        </div>
                    </template>
                </div>
            </div>
            
            <!-- Submit Button -->
            <div class="flex justify-end space-x-2">
                <button type="button" @click="cancelPostSave()" class="btn btn-ghost">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Post</button>
            </div>
        </form>
    </div>
</div>
```

### 3.3: Add Post Save State Variables and Functions
```javascript
// Add to appState() function
showPostSaveForm: false,
currentSaveFiles: [],
postFormData: {
    title: '',
    content: '',
},

// Prepare post save from enhanced media
preparePostSave() {
    // If we're saving enhanced files, get those
    const filesToSave = [];
    
    // Get enhanced media files
    for (let index in hasEnhanced) {
        if (enhancedResults[index]) {
            // Convert base64 to file
            const file = this.base64ToFile(enhancedResults[index], `enhanced-${index}.jpg`, 'image/jpeg');
            filesToSave.push(file);
        }
    }
    
    // If no enhanced files, use the original selected files
    if (filesToSave.length === 0 && selectedFiles.length > 0) {
        filesToSave.push(...selectedFiles.filter(f => f.type.includes('image')));
    }
    
    this.currentSaveFiles = filesToSave;
    this.postFormData = {
        title: '',
        content: ''
    };
    this.showPostSaveForm = true;
},

// Cancel post save
cancelPostSave() {
    this.showPostSaveForm = false;
    this.currentSaveFiles = [];
    this.postFormData = {
        title: '',
        content: ''
    };
},

// Helper function to convert base64 to File
base64ToFile(base64Data, filename, mimeType) {
    const byteString = atob(base64Data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    return new File([ab], filename, { type: mimeType });
},

// Save post with images
async savePost() {
    const formData = new FormData();
    formData.append('title', this.postFormData.title);
    formData.append('content', this.postFormData.content);
    
    // Append all files
    this.currentSaveFiles.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
    });
    
    formData.append('_csrf', this.csrfToken);
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to save post');
        }
        
        // Show success message
        this.showNotification('Post saved successfully', 'success');
        
        // Close form
        this.cancelPostSave();
        
        // Show posts view with newly saved post
        this.showPostsView = true;
        await this.loadUserPosts();
    } catch (error) {
        console.error('Error saving post:', error);
        this.showNotification(error.message, 'error');
    }
}
```

## Step 4: Develop Post Management UI

### 4.1: Create Post Editing Interface
```html
<!-- Post Edit Modal -->
<div 
    x-show="editingPost !== null" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
>
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-xl font-semibold" x-text="editingPost === 'new' ? 'Create New Post' : 'Edit Post'"></h2>
            <button @click="cancelPostEdit()" class="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <!-- Form -->
        <form @submit.prevent="saveEditedPost()" class="p-4">
            <!-- Title -->
            <div class="mb-4">
                <label for="edit-post-title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                    type="text" 
                    id="edit-post-title" 
                    x-model="postFormData.title" 
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    required
                >
            </div>
            
            <!-- Content -->
            <div class="mb-4">
                <label for="edit-post-content" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                    id="edit-post-content" 
                    x-model="postFormData.content" 
                    rows="4" 
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    required
                ></textarea>
            </div>
            
            <!-- Image -->
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Images</label>
                
                <!-- Existing Images -->
                <div x-show="postFormData.images && postFormData.images.length > 0" class="flex flex-wrap gap-2 mb-2">
                    <template x-for="(img, imgIndex) in postFormData.images" :key="imgIndex">
                        <div class="relative h-20 w-20 rounded overflow-hidden border border-gray-200">
                            <img :src="img.url || URL.createObjectURL(img)" class="h-full w-full object-cover">
                            <button 
                                type="button"
                                @click="removePostImage(imgIndex)" 
                                class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                                ×
                            </button>
                        </div>
                    </template>
                </div>
                
                <!-- Add Images -->
                <input 
                    type="file" 
                    id="post-image-upload" 
                    @change="addPostImages($event)" 
                    accept="image/*" 
                    multiple
                    class="w-full text-sm text-gray-500
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-primary-light file:text-primary
                           hover:file:bg-primary-medium"
                >
            </div>
            
            <!-- Submit Button -->
            <div class="flex justify-end space-x-2">
                <button type="button" @click="cancelPostEdit()" class="btn btn-ghost">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>
```

### 4.2: Implement Post Editing Functions
```javascript
// Add to appState() function
editingPost: null,

// Create new post
createNewPost() {
    this.editingPost = 'new';
    this.postFormData = {
        title: '',
        content: '',
        images: []
    };
},

// Edit existing post
editPost(post) {
    this.editingPost = post.id;
    this.postFormData = {
        title: post.title,
        content: post.content,
        images: post.images ? post.images.map(img => ({ url: img })) : []
    };
},

// Cancel post editing
cancelPostEdit() {
    this.editingPost = null;
    this.postFormData = {
        title: '',
        content: '',
        images: []
    };
},

// Add images to post
addPostImages(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        if (!this.postFormData.images) {
            this.postFormData.images = [];
        }
        
        for (let i = 0; i < files.length; i++) {
            this.postFormData.images.push(files[i]);
        }
    }
},

// Remove image from post
removePostImage(index) {
    this.postFormData.images.splice(index, 1);
},

// Save edited post
async saveEditedPost() {
    const isNewPost = this.editingPost === 'new';
    const url = isNewPost ? '/api/posts' : `/api/posts/${this.editingPost}`;
    const method = isNewPost ? 'POST' : 'PUT';
    
    const formData = new FormData();
    formData.append('title', this.postFormData.title);
    formData.append('content', this.postFormData.content);
    
    // Add images that are File objects (new uploads)
    const newImages = this.postFormData.images.filter(img => img instanceof File);
    newImages.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
    });
    
    // Add URLs of existing images (for edit)
    const existingImages = this.postFormData.images
        .filter(img => !(img instanceof File))
        .map(img => img.url);
    
    if (existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(existingImages));
    }
    
    formData.append('_csrf', this.csrfToken);
    
    try {
        const response = await fetch(url, {
            method: method,
            body: formData,
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(isNewPost ? 'Failed to create post' : 'Failed to update post');
        }
        
        // Show success message
        this.showNotification(isNewPost ? 'Post created successfully' : 'Post updated successfully', 'success');
        
        // Close form and reload posts
        this.cancelPostEdit();
        await this.loadUserPosts();
    } catch (error) {
        console.error('Error saving post:', error);
        this.showNotification(error.message, 'error');
    }
}
```

### 4.3: Implement Post Deletion
```javascript
// Add to appState() function
// Confirm and delete post
confirmDeletePost(postId) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        this.deletePost(postId);
    }
},

// Delete post
async deletePost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete post');
        }
        
        // Show success message
        this.showNotification('Post deleted successfully', 'success');
        
        // Reload posts
        await this.loadUserPosts();
    } catch (error) {
        console.error('Error deleting post:', error);
        this.showNotification(error.message, 'error');
    }
},

// Format date helper
formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}
```

## Step 5: Backend Implementation

### 5.1: Create Posts Collection in PocketBase
Collection name: `posts`
Fields:
- `id` (auto-generated)
- `title` (text, required)
- `content` (text, required)
- `images` (json, array of image URLs)
- `user` (relation to Users collection, required)
- `created` (date, auto)
- `updated` (date, auto)

### 5.2: Create API Endpoints in server.js

```javascript
// Get user posts
app.get('/api/posts', authenticatedOnly, csrfProtection, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Fetch all posts for the current user
        const posts = await pb.collection('posts').getList(1, 50, {
            filter: `user="${userId}"`,
            sort: '-created'
        });
        
        res.json({ posts: posts.items });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Create new post
app.post('/api/posts', authenticatedOnly, upload.array('images', 10), csrfProtection, async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.user.id;
        
        // Validate input
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
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
            for (const file of req.files) {
                // Process and store the image
                const formData = new FormData();
                formData.append('file', fs.createReadStream(file.path));
                
                // Create file record in PocketBase
                const fileRecord = await pb.collection('files').create(formData);
                
                // Add image URL to post data
                postData.images.push(pb.files.getUrl(fileRecord, fileRecord.file));
                
                // Clean up temporary file
                fs.unlinkSync(file.path);
            }
        }
        
        // Create the post
        const post = await pb.collection('posts').create(postData);
        
        res.status(201).json({ post });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Update existing post
app.put('/api/posts/:id', authenticatedOnly, upload.array('images', 10), csrfProtection, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, existingImages } = req.body;
        const userId = req.user.id;
        
        // Validate input
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        // Check if post exists and belongs to the user
        try {
            const existingPost = await pb.collection('posts').getOne(id);
            
            if (existingPost.user !== userId) {
                return res.status(403).json({ error: 'You do not have permission to edit this post' });
            }
        } catch (err) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Prepare update data
        const updateData = {
            title: title,
            content: content,
            images: existingImages ? JSON.parse(existingImages) : []
        };
        
        // Handle image uploads if provided
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // Process and store the image
                const formData = new FormData();
                formData.append('file', fs.createReadStream(file.path));
                
                // Create file record in PocketBase
                const fileRecord = await pb.collection('files').create(formData);
                
                // Add image URL to update data
                updateData.images.push(pb.files.getUrl(fileRecord, fileRecord.file));
                
                // Clean up temporary file
                fs.unlinkSync(file.path);
            }
        }
        
        // Update the post
        const post = await pb.collection('posts').update(id, updateData);
        
        res.json({ post });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// Delete post
app.delete('/api/posts/:id', authenticatedOnly, csrfProtection, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        // Check if post exists and belongs to the user
        try {
            const existingPost = await pb.collection('posts').getOne(id);
            
            if (existingPost.user !== userId) {
                return res.status(403).json({ error: 'You do not have permission to delete this post' });
            }
        } catch (err) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Delete the post
        await pb.collection('posts').delete(id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});
```

### 5.3: Add Middleware Setup
```javascript
// File upload middleware (if not already defined)
const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// CSRF Protection (if not already defined)
const csrfProtection = csrf({ cookie: true });
```

## Step 6: Connect Frontend and Backend

### 6.1: Add Notification System
```javascript
// Add to appState() function
notification: {
    message: '',
    type: 'info',
    visible: false
},

// Show notification
showNotification(message, type = 'info') {
    this.notification = {
        message,
        type,
        visible: true
    };
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        this.notification.visible = false;
    }, 3000);
}
```

### 6.2: Add Notification Component
```html
<!-- Notification Toast -->
<div
    x-show="notification.visible"
    x-transition:enter="transition ease-out duration-300"
    x-transition:enter-start="opacity-0 transform translate-y-2"
    x-transition:enter-end="opacity-100 transform translate-y-0"
    x-transition:leave="transition ease-in duration-300"
    x-transition:leave-start="opacity-100 transform translate-y-0"
    x-transition:leave-end="opacity-0 transform translate-y-2"
    :class="{
        'bg-green-100 border-green-500 text-green-700': notification.type === 'success',
        'bg-red-100 border-red-500 text-red-700': notification.type === 'error',
        'bg-blue-100 border-blue-500 text-blue-700': notification.type === 'info'
    }"
    class="fixed bottom-4 right-4 p-4 rounded-lg border-l-4 shadow-md max-w-md z-50"
>
    <div class="flex items-center">
        <div x-text="notification.message"></div>
        <button @click="notification.visible = false" class="ml-4 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    </div>
</div>
```

## Step 7: Testing and Optimization

### 7.1: Testing Checklist
- [ ] Authentication properly controls access to posts features
- [ ] "Gallery" button correctly opens file browser
- [ ] "My Posts" button appears only for authenticated users
- [ ] Post listing page loads and displays user posts
- [ ] Empty state shows when user has no posts
- [ ] Creating a new post works (both from enhancement workflow and blank)
- [ ] Post editing functionality works (title, content, images)
- [ ] Post deletion works with confirmation
- [ ] Image uploads and previews work correctly
- [ ] Error states display appropriate messages
- [ ] Responsive design works on mobile devices

### 7.2: Performance Optimizations
- Implement image resizing before upload to reduce file size
- Add pagination for users with many posts
- Implement lazy loading for post images

### 7.3: UI Refinements
- Add sort options for posts (newest, oldest, alphabetical)
- Add filter capabilities (with/without images, date range)
- Improve mobile layout for better touch interaction
- Add transitions and animations for smoother UX

### 7.4: Error Handling Improvements
- Add more specific error messages for different failure cases
- Implement retry logic for failed API calls
- Add offline support with local storage for draft posts 