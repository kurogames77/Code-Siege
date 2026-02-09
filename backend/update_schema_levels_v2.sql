-- Add course_mode and difficulty_level to course_levels with strict constraints
ALTER TABLE course_levels 
ADD COLUMN course_mode TEXT DEFAULT 'Beginner' CHECK (course_mode IN ('Beginner', 'Intermediate', 'Advance')),
ADD COLUMN difficulty_level TEXT DEFAULT 'Easy' CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard'));

-- Update unique constraint to ensure categories are isolated
-- This prevents level 1 from appearing twice in the same category
ALTER TABLE course_levels DROP CONSTRAINT IF EXISTS course_levels_unique_order;
ALTER TABLE course_levels ADD CONSTRAINT course_levels_unique_category_order 
UNIQUE (course_id, course_mode, difficulty_level, level_order);
