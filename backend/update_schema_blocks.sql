-- Add block support to course_levels
ALTER TABLE course_levels ADD COLUMN initial_blocks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE course_levels ADD COLUMN correct_sequence JSONB DEFAULT '[]'::jsonb;

-- Adjust constraints if needed
-- (The existing unique constraint is already correct)
