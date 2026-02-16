/*
  # Create Demo User

  1. Security
    - Creates a demo user account with the credentials shown in the LoginForm UI
    - Email: demo@example.com
    - Password: demo123
  
  2. Purpose
    - Ensures the demo credentials displayed in the login form actually work
    - Provides a working test account for users to try the application
*/

-- Insert demo user into auth.users table
-- Note: This is a Supabase-specific approach to create a demo user
-- The password will be hashed automatically by Supabase
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo@example.com',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;