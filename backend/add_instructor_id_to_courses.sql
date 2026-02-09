-- Add instructor_id column to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Clear existing courses to start fresh with strict ownership
DELETE FROM public.courses;

-- Update RLS policy for courses to allow instructors to see their own courses
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
