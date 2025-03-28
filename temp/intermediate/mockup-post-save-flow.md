# User Content Management - UI Mockups

This document provides visual descriptions of the new UI components for the parallel save flow in the User Content Management feature.

## 1. Post Complete Screen

The Post Complete screen will be enhanced to include both sharing and saving options:

```
+-------------------------------------------+
|                                           |
|     [User Avatar]  You                    |
|                    Just now               |
|                                           |
|  +-----------------------------------+    |
|  |                                   |    |
|  |          [Post Media]             |    |
|  |                                   |    |
|  +-----------------------------------+    |
|                                           |
|  Generated Caption:                       |
|  "Enjoying a perfect summer day with      |
|  friends at the beach. The waves are      |
|  amazing today! #SummerVibes"             |
|                                           |
|  +---------------+    +---------------+   |
|  |               |    |               |   |
|  |     Share     |    |   Save Post   |   |
|  |               |    |               |   |
|  +---------------+    +---------------+   |
|                                           |
|  +-----------------------------------+    |
|  |           New Post                |    |
|  +-----------------------------------+    |
|                                           |
+-------------------------------------------+
```

Key Features:
- The Share button maintains its current functionality
- A new Save Post button is added as a parallel option
- The buttons are positioned horizontally to indicate they are separate actions
- The Save Post button uses a different visual style to distinguish it from Share
- The New Post button remains at the bottom

## 2. Save Post Modal

When the Save Post button is clicked, a modal appears:

```
+-------------------------------------------+
|  Save Post                           [X]  |
|-------------------------------------------|
|                                           |
|  Title:                                   |
|  +-----------------------------------+    |
|  | Beach day with friends            |    |
|  +-----------------------------------+    |
|                                           |
|  Description:                             |
|  +-----------------------------------+    |
|  | Enjoying a perfect summer day     |    |
|  | with friends at the beach. The    |    |
|  | waves are amazing today!          |    |
|  | #SummerVibes                      |    |
|  +-----------------------------------+    |
|                                           |
|  Media Preview:                           |
|  +-------+ +-------+ +-------+           |
|  |       | |       | |       |           |
|  |   1   | |   2   | |   3   |           |
|  |       | |       | |       |           |
|  +-------+ +-------+ +-------+           |
|                                           |
|                                           |
|  +-------------+    +----------------+    |
|  |   Cancel    |    |      Save      |    |
|  +-------------+    +----------------+    |
|                                           |
+-------------------------------------------+
```

Key Features:
- Clean, focused modal with a clear title
- Title field (required) for naming the post
- Description textarea pre-filled with the generated caption
- Small previews of the media included in the post
- Cancel and Save buttons
- Save button shows a loading spinner when in progress

## 3. Gallery View (My Posts)

The My Posts page will be updated to resemble a native photo gallery:

```
+-------------------------------------------+
|  My Posts                                 |
|-------------------------------------------|
|                                           |
|  +---------------+  +---------------+     |
|  |               |  |               |     |
|  |    [Thumb]    |  |    [Thumb]    |     |
|  |       +3      |  |       +2      |     |
|  |               |  |               |     |
|  | Beach day     |  | City lights   |     |
|  +---------------+  +---------------+     |
|                                           |
|  +---------------+  +---------------+     |
|  |               |  |               |     |
|  |    [Thumb]    |  |    [Thumb]    |     |
|  |       +5      |  |       +1      |     |
|  |               |  |               |     |
|  | Mountain trip |  | Dinner party  |     |
|  +---------------+  +---------------+     |
|                                           |
|                                           |
|  +-----------------------------------+    |
|  |          Create New Post          |    |
|  +-----------------------------------+    |
|                                           |
+-------------------------------------------+
```

Key Features:
- Grid layout with responsive sizing
- Each post represented by its first image as a thumbnail
- Overlay indicator showing the number of additional media items (e.g., "+3")
- Post title displayed below the thumbnail
- Create New Post button at the bottom
- When a post is tapped/clicked, it opens the full post view with all media and options to edit/delete

## 4. Post Card Interaction

When long-pressing on a post card:

```
+---------------+
|               |
|    [Thumb]    |
|       +3      |
|               |
| Beach day     |
|               |
| [Edit] [Del]  |
+---------------+
```

Key Features:
- Edit and Delete buttons appear on long-press (mobile)
- Confirm dialog appears before deletion
- Edit button opens the post edit form 