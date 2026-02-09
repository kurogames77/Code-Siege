-- Index for faster course filtering by instructor
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);

-- Notify schema cache reload just in case
NOTIFY pgrst, 'reload config';
