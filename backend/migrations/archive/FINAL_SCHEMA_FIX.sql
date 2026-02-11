-- ============================================
-- FINAL SCHEMA FIX: MULTI-DIFFICULTY & BLOCKS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Ensure columns for Modes and Difficulty exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_levels' AND column_name='course_mode') THEN
        ALTER TABLE course_levels ADD COLUMN course_mode TEXT DEFAULT 'Beginner';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_levels' AND column_name='difficulty_level') THEN
        ALTER TABLE course_levels ADD COLUMN difficulty_level TEXT DEFAULT 'Easy';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_levels' AND column_name='initial_blocks') THEN
        ALTER TABLE course_levels ADD COLUMN initial_blocks JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_levels' AND column_name='correct_sequence') THEN
        ALTER TABLE course_levels ADD COLUMN correct_sequence JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Repair Unique Constraints
-- We need levels to be unique PER Course, PER Mode, PER Difficulty, PER Order.
-- First, drop the old restrictive level_order constraint
ALTER TABLE course_levels DROP CONSTRAINT IF EXISTS course_levels_unique_order;
ALTER TABLE course_levels DROP CONSTRAINT IF EXISTS course_levels_course_id_level_order_key;

-- Now add the correct multi-category constraint
ALTER TABLE course_levels DROP CONSTRAINT IF EXISTS course_levels_unique_category_order;
ALTER TABLE course_levels ADD CONSTRAINT course_levels_unique_category_order 
UNIQUE (course_id, course_mode, difficulty_level, level_order);

-- 3. Cleanup existing data (Optional)
-- If you have duplicate levels from testing, you might want to clear them:
-- DELETE FROM course_levels;
