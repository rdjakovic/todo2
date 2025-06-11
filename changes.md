# Changes Log

## 2025-01-27 15:30:00 - Fixed Supabase UUID Error
- Modified `saveLists` function in `src/store/todoStore.ts` to filter out the virtual "All" list before sending data to Supabase
- The "All" list is a client-side only virtual list with ID "all" which is not a valid UUID
- Added filtering logic to prevent the "All" list from being sent to the database while maintaining it in the local state
- Updated localStorage saving logic to consistently exclude the "All" list from database operations
- This resolves the "invalid input syntax for type uuid" error when saving lists to Supabase