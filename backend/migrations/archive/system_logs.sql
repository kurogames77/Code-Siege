CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all logs
CREATE POLICY "Admins can view all logs" ON public.system_logs
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

-- Policy: Backend/Server functions key can insert (simulating this for now by allowing any authenticated user to log actions for demo purposes, or better, keep it restrictive)
-- For this app, let's allow authenticated users to INSERT logs (e.g. client side errors) but only admins can VIEW.
CREATE POLICY "Users can insert logs" ON public.system_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

