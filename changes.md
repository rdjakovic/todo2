# Changes Log

## 2025-01-27 15:30:00 - Fixed Supabase UUID Error
- Modified `saveLists` function in `src/store/todoStore.ts` to filter out the virtual "All" list before sending data to Supabase
- The "All" list is a client-side only virtual list with ID "all" which is not a valid UUID
- Added filtering logic to prevent the "All" list from being sent to the database while maintaining it in the local state
- Updated localStorage saving logic to consistently exclude the "All" list from database operations
- This resolves the "invalid input syntax for type uuid" error when saving lists to Supabase

## 2025-01-27 16:00:00 - Fixed All List Toggle Functionality
- Modified `handleToggleShowCompleted` function in `src/components/TodoListView.tsx` to handle the "All" list differently
- The "All" list is a virtual client-side list that should not be saved to the database
- Added special handling for the "All" list to only update local state without attempting to save to Supabase
- This prevents database errors when toggling show/hide completed for the "All" list while maintaining the filtering functionality
- Regular lists continue to save their toggle state to the database as expected

## 2025-01-27 16:30:00 - Added CreateListDialog Component
- Created new `src/components/CreateListDialog.tsx` component for creating new lists with a proper dialog interface
- Replaced inline list creation in `src/components/Sidebar.tsx` with a dialog-based approach for better UX
- Updated `createList` function in `src/store/todoStore.ts` to accept an optional icon parameter
- The new dialog provides icon selection similar to the edit list dialog, maintaining UI consistency
- Removed inline input fields and related state management from Sidebar component
- Users can now create lists with custom names and icons through a dedicated dialog interface

## 2025-01-27 17:00:00 - Fixed New List State Update Issue
- Fixed issue where newly created lists didn't appear in the sidebar after closing the dialog
- Modified `createList` function in `src/store/todoStore.ts` to properly handle state updates
- Changed from using `saveLists` to direct database insertion followed by immediate state update
- Added proper error handling and success/error toast notifications for list creation
- Ensured localStorage is updated correctly after successful list creation
- New lists now appear immediately in the sidebar without requiring a page refresh
- New lists now appear immediately in the sidebar without requiring a page refresh

## 2025-01-27 17:15:00 - Increased Icon Size in List Dialogs
- Made icons in the "Choose Icon" section slightly larger in both Edit List and Create List dialogs
- Changed icon size from `w-4 h-4` to `w-5 h-5` for better visibility and easier selection
- Updated both `src/components/ListEditDialog.tsx` and `src/components/CreateListDialog.tsx`
- Improves user experience when selecting icons for lists

## 2025-01-27 17:30:00 - Added Priority Colors to Todo Items
- Added color-coded backgrounds to todo items based on their priority levels
- High priority todos now have a red tint background (`bg-red-50` light, `bg-red-950/30` dark)
- Medium priority todos have a yellow tint background (`bg-yellow-50` light, `bg-yellow-950/30` dark)
- Low priority todos have a blue tint background (`bg-blue-50` light, `bg-blue-950/30` dark)
- Added priority badges next to the creation date showing the priority level with matching colors
- Completed todos maintain a gray background regardless of priority
- Updated `src/components/TodoItem.tsx` with helper functions for priority colors and badges
- Improves visual organization and quick identification of task priorities

## 2025-01-27 17:45:00 - Updated Completed Items Priority Colors
- Modified completed todo items to maintain their priority-based color coding
- Completed items now show a more subtle version of their priority colors (50% opacity for backgrounds, 30% for borders)
- High priority completed items: subtle red tint
- Medium priority completed items: subtle yellow tint  
- Low priority completed items: subtle blue tint
- Items without priority still use gray background when completed
- Updated `getPriorityColors` helper function in `src/components/TodoItem.tsx`
- Allows users to still identify task priorities even after completion

## 2025-01-27 18:00:00 - Added Notes Toggle Feature to Todo Items
- Added toggle functionality to show/hide notes text on todo items when they contain notes
- Added "Show notes" / "Hide notes" button with chevron icons for clear visual indication
- Notes are displayed in a subtle gray background container when expanded
- Toggle button only appears when todo item has notes content
- Added click event handling to prevent interference with drag and drop functionality
- Updated `src/components/TodoItem.tsx` with useState hook and chevron icons from Heroicons
- Improves interface cleanliness while maintaining access to detailed todo information