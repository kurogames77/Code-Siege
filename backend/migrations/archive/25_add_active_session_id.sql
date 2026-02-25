-- Migration to support 1 session per student
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS active_session_id UUID;
