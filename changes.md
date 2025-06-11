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