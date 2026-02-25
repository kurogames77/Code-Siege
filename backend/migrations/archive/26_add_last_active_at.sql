-- Migration for Strict Single Session (Heartbeat Method)
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;
