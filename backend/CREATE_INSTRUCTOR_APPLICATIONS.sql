-- Create/Update instructor_applications table for pending instructor registrations
-- Run this in Supabase SQL Editor

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.instructor_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL, -- Store hashed password until approval
    student_id TEXT,
    course TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id),
    rejection_reason TEXT
);

-- Add RLS policies
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;

-- Only admins/instructors can view applications
CREATE POLICY "Admins can view applications" ON public.instructor_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'instructor')
        )
    );

-- Anyone can insert (for registration)
CREATE POLICY "Anyone can apply" ON public.instructor_applications
    FOR INSERT
    WITH CHECK (true);

-- Only admins can update (approve/reject)
CREATE POLICY "Admins can update applications" ON public.instructor_applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_instructor_applications_status ON public.instructor_applications(status);
CREATE INDEX IF NOT EXISTS idx_instructor_applications_email ON public.instructor_applications(email);
