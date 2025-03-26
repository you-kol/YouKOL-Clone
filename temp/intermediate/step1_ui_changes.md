 # Step 1: UI Changes for User Content Management

This document outlines the specific changes needed for Step 1 of the User Content Management implementation.

## 1.1: Rename "Upload" button to "Gallery"

Current code (line 120-126 in index.html):
```html
<label 
    for="file-upload" 
    class="upload-btn w-full md:w-80 flex items-center justify-center rounded-full py-3 px-6 cursor-pointer"
>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
    </svg>
    Upload
</label>
```

New code:
```html
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

## 1.2: Add "My Posts" to User Menu

Current code (line 88-95 in index.html):
```html
<div 
    x-show="userMenuOpen" 
    @click.away="userMenuOpen = false"
    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
>
    <a href="#" @click.prevent="showProfileView = true; userMenuOpen = false; loadProfileForm()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        My Profile
    </a>
    <a href="#" @click.prevent="logout(); userMenuOpen = false" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        Logout
    </a>
</div>
```

New code:
```html
<div 
    x-show="userMenuOpen" 
    @click.away="userMenuOpen = false"
    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
>
    <a href="#" @click.prevent="showPostsView = true; userMenuOpen = false; loadUserPosts()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        My Posts
    </a>
    <a href="#" @click.prevent="showProfileView = true; userMenuOpen = false; loadProfileForm()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        My Profile
    </a>
    <a href="#" @click.prevent="logout(); userMenuOpen = false" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        Logout
    </a>
</div>
```

## 1.3: Authentication Visibility Check

The existing user menu already has the proper authentication checks with:
```html
<div x-show="isAuthenticated" class="relative" x-data="{ userMenuOpen: false }">
```

No additional changes needed for this part as the visibility is already controlled by the `isAuthenticated` state.