-- Enable RLS on courses table if not already enabled
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone (anon and authenticated) to read from courses
DROP POLICY IF EXISTS "Allow public read access to courses" ON courses;
CREATE POLICY "Allow public read access to courses"
ON courses FOR SELECT
TO public
USING (true);
