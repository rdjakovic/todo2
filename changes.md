# Changes Log

## 2025-01-21 - Fix Demo User Credentials Error

**Date & Time**: 2025-01-21

**Summary**: Fixed Supabase authentication error "Invalid login credentials" by creating a migration to add the demo user account (demo@example.com / demo123) that is advertised in the LoginForm UI. This ensures the demo credentials actually work when users try to sign in.

**Files Changed**:
- Created `supabase/migrations/create_demo_user.sql` - Migration to create demo user account with the credentials shown in the LoginForm component

**Error Fixed**: Resolved "Invalid login credentials" error when using demo credentials from the login form.