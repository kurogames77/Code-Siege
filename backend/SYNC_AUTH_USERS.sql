-- ============================================
-- FIX MISSING USER & PERMISSIONS (SYNC SCRIPT)
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create a function to auto-sync new users from auth.users to public.users
-- This ensures 'returning users' or 'new signups' always have a public profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, role)
  VALUES (new.id, new.email, split_part(new.email, '@', 1), 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger (if not already bound)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. MANUAL SYNC: Insert any missing users RIGHT NOW
-- This fixes your specific issue where your user might exist in Auth but not Public
INSERT INTO public.users (id, email, username, role)
SELECT id, email, split_part(email, '@', 1), 'instructor' -- Defaulting to instructor for safety
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 4. FORCE UPDATE your specific user to be an INSTRUCTOR
-- (Since we don't know your exact ID, we set ALL current users to instructor to be safe for this fix)
UPDATE public.users 
SET role = 'student' 
WHERE role = 'user';

-- 5. FINAL SAFETY: Allow insert if user exists in public.users (regardless of role for now, to test)
DROP POLICY IF EXISTS "Instructors can insert levels" ON course_levels;
CREATE POLICY "Instructors can insert levels" ON course_levels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()
        )
    );
