-- Remove the unused 'score' column from user_progress table
-- Run this in Supabase SQL Editor

ALTER TABLE public.user_progress DROP COLUMN IF EXISTS score;
