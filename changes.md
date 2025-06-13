# Changes Log

## 2025-01-27 - Supabase Connection Error Fix
- Enhanced error handling in `src/lib/supabase.ts`
- Added better error messages for missing environment variables
- Added URL format validation for Supabase URL
- Improved Supabase client configuration with proper auth settings
- Updated connection test to be more robust

## 2025-01-27 - Fix Supabase Refresh Token Error
- Modified `src/store/authStore.ts` to handle invalid refresh token errors
- Added specific error handling for 'Invalid Refresh Token', 'Refresh Token Not Found', and 'invalid_grant' errors
- Enhanced auth state change listener to reset todo store on SIGNED_OUT events
- This prevents authentication failures when stored sessions become invalid on the server

## 2025-01-27 - Fix Data Loading After Login
- Added useEffect in `src/App.tsx` to reset `dataInitialized` state when user becomes unauthenticated
- This ensures that when a user logs out and logs back in, the data fetching effect runs again
- Fixes issue where todos wouldn't load after login without refreshing the page