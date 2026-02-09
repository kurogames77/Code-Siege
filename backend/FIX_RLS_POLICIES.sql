-- ============================================
-- FIX RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- The error "new row violates row-level security policy" means the INSERT policy is failing.
-- We need to ensure that Authenticated Users (Instructors) can INSERT, UPDATE, and DELETE.

-- 1. Reset Policies for course_levels
ALTER TABLE course_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read course_levels" ON course_levels;
DROP POLICY IF EXISTS "Instructors can manage levels" ON course_levels;
DROP POLICY IF EXISTS "Instructors can insert levels" ON course_levels;
DROP POLICY IF EXISTS "Instructors can update levels" ON course_levels;
DROP POLICY IF EXISTS "Instructors can delete levels" ON course_levels;


-- 2. Allow Reading (Everyone)
CREATE POLICY "Anyone can read course_levels" ON course_levels
    FOR SELECT USING (true);

-- 3. Allow Inserting (Instructors)
-- We explicitly separate INSERT because it's often the one that fails with complex conditions
CREATE POLICY "Instructors can insert levels" ON course_levels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'admin')
        )
    );

-- 4. Allow Updates/Deletes (Instructors)
CREATE POLICY "Instructors can update levels" ON course_levels
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'admin')
        )
    );

CREATE POLICY "Instructors can delete levels" ON course_levels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'admin')
        )
    );
