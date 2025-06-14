# Project Changes Log

## 2025-01-05 - Fixed signOut error handling
**Time:** Current timestamp
**Summary:** Modified the signOut function in src/store/authStore.ts to properly handle session_not_found errors during logout. The function now clears the local user state and resets the todo store even when Supabase returns a session_not_found error, ensuring the UI correctly reflects the signed-out state.

**Changes made:**
- Enhanced error handling in signOut function catch block
- Added specific handling for session_not_found errors during logout
- Ensured local state is cleared even when server logout fails
- User state is now set to null and todo store is reset regardless of logout error type

## 2025-01-27 - TypeScript Error Fix
**Date:** January 27, 2025  
**Time:** Current timestamp  
**Summary:** Fixed TypeScript error in App.tsx by removing invalid `onEdit` prop from TodoItem component in DragOverlay. The TodoItem component uses `onOpenEditDialog` for edit functionality, so the `onEdit` prop was not needed and was causing compilation errors.

## 2025-01-27 - Comprehensive Code Cleanup
**Date:** January 27, 2025
**Time:** Current timestamp
**Summary:** Performed comprehensive cleanup of unused code, imports, variables, and functions throughout the application to improve maintainability and reduce bundle size.

**Changes made:**

### Tauri Backend Cleanup (src-tauri/src/lib.rs):
- Removed all commented-out unused code including imports, constants, and functions
- Cleaned up the invoke_handler to only include necessary functionality
- Removed unused `save_todos`, `save_lists`, `load_todos`, `load_lists` functions that were marked as unused

### Component Interface Cleanup:
- **TodoItem.tsx**: Removed unused `onEdit` prop from TodoItemProps interface and component implementation
- **TodoItem.tsx**: Fixed `getPriorityColors` helper function by removing unused `priority` parameter
- **LoginForm.tsx**: Removed unused `onSuccess` prop from LoginFormProps interface and component
- **TodoItem.test.tsx**: Updated test to use string IDs instead of numbers and removed unused mock functions

### App.tsx Optimizations:
- Removed unused `fetchLists` from useTodoStore destructuring 
- Removed unnecessary `onSuccess` prop from LoginForm component
- Removed invalid `onEdit` prop from TodoItem component in DragOverlay
- Improved data fetching logic to avoid dependency issues

### Utility Functions Cleanup (src/utils/helper.ts):
- Removed unused `processLoadedLists` function (no longer needed with normalized data structure)
- Removed unused `getListNameById` function (not used anywhere in codebase)
- Removed unused `getListByName` function (not used anywhere in codebase)
- Kept only actively used utility functions: `getListById`, `isValidNativeDate`, `formatNativeDate`

### Benefits Achieved:
- 🧹 **Cleaner Codebase**: Removed all dead code and unused imports
- 📦 **Smaller Bundle Size**: Eliminated unused functions and imports from build
- 🔧 **Better Maintainability**: Reduced cognitive load by removing confusing unused code
- ✅ **Type Safety**: Fixed all TypeScript errors related to incorrect prop types
- 🚀 **Performance**: Reduced memory usage by eliminating unused function definitions

**Files Modified:**
- `src-tauri/src/lib.rs`: Removed all commented unused code
- `src/App.tsx`: Removed unused imports and props
- `src/components/TodoItem.tsx`: Cleaned up interface and helper functions
- `src/components/TodoItem.test.tsx`: Fixed test data types and removed unused mocks
- `src/components/LoginForm.tsx`: Removed unused props
- `src/utils/helper.ts`: Removed unused utility functions

The application now has a much cleaner codebase with no unused code, better type safety, and improved maintainability.

## 2025-01-27 - PWA Login Issues Fix
**Date:** January 27, 2025
**Time:** Current timestamp
**Summary:** Fixed PWA login issues and updated deprecated meta tags to resolve console errors and authentication problems in PWA mode.

**Issues Fixed:**
1. **Deprecated Meta Tag**: Replaced `apple-mobile-web-app-capable` with `mobile-web-app-capable` to resolve deprecation warning
2. **Service Worker Caching Issues**: Updated service worker to exclude Supabase API requests from caching to prevent authentication interference
3. **Cache Strategy**: Improved caching strategy to handle authentication and API requests properly

**Changes made:**

### index.html:
- Replaced deprecated `<meta name="apple-mobile-web-app-capable" content="yes">` with `<meta name="mobile-web-app-capable" content="yes">`
- Maintained all other PWA meta tags for proper mobile app behavior

### public/sw.js:
- **Updated Cache Version**: Changed cache name to 'todo-app-v2' to force cache refresh
- **API Request Exclusion**: Added logic to exclude Supabase API requests from caching:
  - Supabase domains (supabase.co, supabase.in)
  - Authentication endpoints (/auth/)
  - REST API endpoints (/rest/)
  - Realtime endpoints (/realtime/)
  - All non-GET requests
- **Improved Cache Strategy**: 
  - API requests always go to network
  - Static resources use cache-first strategy
  - Added fallback to index.html for offline document requests
- **Service Worker Lifecycle**: 
  - Added `skipWaiting()` on install for immediate activation
  - Added `clients.claim()` on activate for immediate control
- **Enhanced Error Handling**: Added proper error handling for offline scenarios
- **Notification Handling**: Added notification click handler for better UX

**Benefits Achieved:**
- ✅ **Resolved Console Errors**: Eliminated deprecated meta tag warnings
- 🔐 **Fixed Authentication**: Supabase requests no longer cached, allowing proper login/logout
- 📱 **Better PWA Experience**: Improved offline handling and cache management
- 🚀 **Faster Updates**: Service worker updates immediately without waiting
- 🔄 **Reliable Sync**: API requests always fetch fresh data from server

**Technical Details:**
- The service worker now uses a sophisticated caching strategy that distinguishes between static assets (cached) and dynamic API requests (always fresh)
- Authentication flows work properly in PWA mode as they bypass the cache
- Users can now log in and out successfully in installed PWA mode
- The app gracefully handles offline scenarios while maintaining authentication integrity

This fix resolves the PWA login issues while maintaining optimal performance and offline capabilities.