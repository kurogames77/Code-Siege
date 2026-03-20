-- Migration: Add 'guest' to the users role check constraint
-- The current check constraint only allows: student, instructor, admin, user
-- We need to add 'guest' as a valid role value.

-- Step 1: Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Re-create it with 'guest' included
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('student', 'instructor', 'admin', 'user', 'guest'));
