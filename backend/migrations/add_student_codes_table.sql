-- Migration: add_student_codes_table

CREATE TABLE IF NOT EXISTS public.student_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- RLS Policies
ALTER TABLE public.student_codes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage student codes" 
ON public.student_codes 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Public can read to validate code during signup OR Service Role can read
-- We'll just allow public read for now so the client can validate, or we can handle it server-side.
-- Given backend flow uses service role in auth.js, we don't strictly need public read.
CREATE POLICY "Anyone can read student codes" 
ON public.student_codes 
FOR SELECT 
USING (true);

-- Instructors optionally can read if they want to manage them (based on requirement, let's stick to admin for now)
