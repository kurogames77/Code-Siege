-- Rename 'score' column to 'grade' and change its type to VARCHAR to support letter grades
-- Note: This assumes you want to preserve existing data.
-- Casting INTEGER to VARCHAR is straightforward.

ALTER TABLE public.certificates
RENAME COLUMN score TO grade;

ALTER TABLE public.certificates
ALTER COLUMN grade TYPE VARCHAR(10) USING grade::VARCHAR;
