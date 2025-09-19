-- Create a demo user account for testing
-- Note: This creates the user via SQL, but they'll still need to verify their email
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
  '11111111-1111-1111-1111-111111111111'::uuid,
  'authenticated',
  'authenticated',
  'demo@agentic.ai',
  crypt('demo123', gen_salt('bf')), -- This creates a hashed password for 'demo123'
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Demo User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);