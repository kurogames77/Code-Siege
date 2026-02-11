-- Fix Scrambled Level Orders
-- This script re-assigns level_order to be sequential (1, 2, 3...) 
-- for each group of (course_id, course_mode, difficulty_level).

WITH OrderedLevels AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY course_id, course_mode, difficulty_level 
            ORDER BY created_at ASC
        ) as new_order
    FROM 
        public.course_levels
)
UPDATE public.course_levels
SET level_order = OrderedLevels.new_order
FROM OrderedLevels
WHERE public.course_levels.id = OrderedLevels.id;
