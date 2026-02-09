-- Add missing columns to users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS school VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS college VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS course VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_id VARCHAR(50);

-- Make student_id unique if it exists (optional, based on your needs)
-- ALTER TABLE public.users ADD CONSTRAINT users_student_id_key UNIQUE (student_id);
