-- Add current_difficulty column to public.users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS current_difficulty TEXT DEFAULT 'Easy';
