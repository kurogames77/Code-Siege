-- Fix Scrambled Level Orders (SAFE MODE)
-- We do this in two steps to avoid "Duplicate Key" errors.

-- Step 1: Update to negative temporary values based on correct order
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
SET level_order = -(OrderedLevels.new_order)
FROM OrderedLevels
WHERE public.course_levels.id = OrderedLevels.id;

-- Step 2: Flip back to positive
UPDATE public.course_levels
SET level_order = ABS(level_order)
WHERE level_order < 0;
