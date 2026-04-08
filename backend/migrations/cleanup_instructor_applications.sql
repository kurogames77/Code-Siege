-- Drops the unused course column from instructor_applications
ALTER TABLE public.instructor_applications 
DROP COLUMN IF EXISTS course;
