-- Add Manual Payments Tracking Table
CREATE TABLE IF NOT EXISTS public.manual_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    gems INTEGER NOT NULL,
    method VARCHAR(20) DEFAULT 'gcash' CHECK (method IN ('gcash', 'maya', 'paypal_manual')),
    reference_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Indexes for Admin Dashboard querying
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON public.manual_payments(status);
CREATE INDEX IF NOT EXISTS idx_manual_payments_user ON public.manual_payments(user_id);

-- Enable RLS
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own manual payments
CREATE POLICY "Users can view own manual payments" ON public.manual_payments FOR SELECT USING (auth.uid() = user_id);

-- Users can insert manual payments (submit a reference number)
CREATE POLICY "Users can insert own manual payments" ON public.manual_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only Admins/Instructors can view ALL manual payments
CREATE POLICY "Admins can view all payments" ON public.manual_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'instructor'))
);

-- Only Admins/Instructors can update payments (approve/reject)
CREATE POLICY "Admins can update payments" ON public.manual_payments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'instructor'))
);
