# Changes Log

## 2025-01-27 - Authentication Session Error Fix
- Fixed Supabase authentication error where invalid/expired JWT tokens were not properly handled
- Modified `src/store/authStore.ts` to explicitly set `user: null` in the catch block of the `initialize` function
- This ensures that when `supabase.auth.getUser()` fails, the application correctly recognizes there's no valid session and prompts for re-authentication
- Prevents subsequent API calls with invalid tokens that result in 403 "Session from session_id claim in JWT does not exist" errors