# Changes Log

## 2025-01-09 - Session Not Found Error Fix
- **File**: `src/store/authStore.ts`
- **Change**: Added handling for 'session_not_found' errors in the auth store initialization
- **Details**: Modified the error handling in the `initialize` function to include 'session_not_found' and 'Session from session_id claim in JWT does not exist' error messages. When these errors occur, the function now clears the invalid session by calling `supabase.auth.signOut()` and resets the authentication state, which resolves the 403 error and prompts the user to re-authenticate.