-- Migration: Remove unused columns from battles and instructor_applications tables
-- Date: 2026-04-05
-- Safe removals only (no code references these columns, all values are NULL)

-- 1. Remove player1_score and player2_score from battles table
ALTER TABLE public.battles
DROP COLUMN IF EXISTS player1_score,
DROP COLUMN IF EXISTS player2_score;

-- 2. Remove course column from instructor_applications table
ALTER TABLE public.instructor_applications
DROP COLUMN IF EXISTS course;
