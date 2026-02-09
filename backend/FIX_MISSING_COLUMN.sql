-- 1. Add the missing column if it doesn't exist
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Force a schema cache reload (crucial for PostgREST to see the new column)
NOTIFY pgrst, 'reload config';

-- 3. Update existing policies just in case
DROP POLICY IF EXISTS "Instructors can manage courses" ON public.courses;
CREATE POLICY "Instructors can manage courses" ON public.courses 
    FOR ALL USING (
        auth.uid() = instructor_id OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );
