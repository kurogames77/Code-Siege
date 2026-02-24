-- ============================================
-- FIX NOTIFICATIONS RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on notifications (just in case)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Participants can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can send notifications" ON public.notifications;
DROP POLICY IF EXISTS "Participants can update notifications" ON public.notifications;

-- 1. Selection Policy: Allow both sender and receiver to see notifications
CREATE POLICY "Participants can view notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- 2. Insertion Policy: Allow any authenticated user to send a notification
-- (The sender_id must match the authenticated user)
CREATE POLICY "Users can send notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 3. Update Policy: Allow receiver to accept/decline or sender to update
CREATE POLICY "Participants can update notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
