# Changes Log

## 2025-01-27 - Authentication Session Error Fix
- Fixed Supabase authentication error where invalid/expired JWT tokens were not properly handled
- Modified `src/store/authStore.ts` to explicitly set `user: null` in the catch block of the `initialize` function
- This ensures that when `supabase.auth.getUser()` fails, the application correctly recognizes there's no valid session and prompts for re-authentication
- Prevents subsequent API calls with invalid tokens that result in 403 "Session from session_id claim in JWT does not exist" errors

## 2025-01-27 - Enhanced Radio Button Visibility in Settings
- Updated radio button styling in Settings - Sorting Items section to use green color when selected
- Changed radio button classes from purple (`text-purple-600`, `focus:ring-purple-500`) to green (`text-green-600`, `focus:ring-green-500`) for better visibility
- Improved user experience by making it clearer which sorting option is currently selected

## 2025-01-27 - Changed Radio Button Background to Red When Selected
- Updated radio button styling in Settings - Sorting Items section to have red background when selected
- Changed radio button classes from green (`text-green-600`, `focus:ring-green-500`) to red (`text-red-600`, `focus:ring-red-500`, `bg-red-600`)
- Radio button now shows red background color inside the circle when selected instead of gray