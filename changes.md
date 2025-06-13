# Change Log

## 2025-01-27 - Fix Supabase Refresh Token Error
- Modified `src/store/authStore.ts` to handle invalid refresh token errors
- Added specific error handling for 'Invalid Refresh Token', 'Refresh Token Not Found', and 'invalid_grant' errors
- Enhanced auth state change listener to reset todo store on SIGNED_OUT events
- This prevents authentication failures when stored sessions become invalid on the server