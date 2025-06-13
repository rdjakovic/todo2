# Project Changes Log

## 2025-01-05 - Fixed signOut error handling
**Time:** Current timestamp
**Summary:** Modified the signOut function in src/store/authStore.ts to properly handle session_not_found errors during logout. The function now clears the local user state and resets the todo store even when Supabase returns a session_not_found error, ensuring the UI correctly reflects the signed-out state.

**Changes made:**
- Enhanced error handling in signOut function catch block
- Added specific handling for session_not_found errors during logout
- Ensured local state is cleared even when server logout fails
- User state is now set to null and todo store is reset regardless of logout error type