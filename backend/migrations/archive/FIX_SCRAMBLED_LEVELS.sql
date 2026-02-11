-- ============================================
-- FIX SCRAMBLED LEVEL ORDERING
-- Run this in Supabase SQL Editor to re-index all scrambled levels
-- ============================================

-- This script uses a window function to intelligently re-assign numbering 1-10 
-- based on the current relative order for every course, mode, and difficulty.

WITH OrderedLevels AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY course_id, course_mode, difficulty_level 
            ORDER BY level_order ASC, created_at ASC
        ) as new_order
    FROM course_levels
)
UPDATE course_levels
SET level_order = OrderedLevels.new_order
FROM OrderedLevels
WHERE course_levels.id = OrderedLevels.id;

-- Now the numbering will be strictly 1, 2, 3... 10 without gaps or scrambles.
