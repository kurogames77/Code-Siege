-- Migration: cleanup_courses_columns.sql
-- Description: Drops icon_type, color, difficulty, and mode from the courses table as they are now handled elsewhere or statically.

ALTER TABLE public.courses 
DROP COLUMN IF EXISTS icon_type,
DROP COLUMN IF EXISTS color,
DROP COLUMN IF EXISTS difficulty,
DROP COLUMN IF EXISTS mode;
