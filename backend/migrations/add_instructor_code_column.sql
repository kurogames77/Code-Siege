-- Add student_code column to users table
-- Instructors set a custom code; students enter it during registration for verification.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_code VARCHAR(50);
