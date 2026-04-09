-- 1. Add new columns to user_progress
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gems INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS selected_hero VARCHAR(50) DEFAULT '3';

-- 2. Create the baseline global progress row for all users who don't have any progress yet
INSERT INTO public.user_progress (user_id, tower_id, floor, completed, level, xp, gems, selected_hero)
SELECT id, 'global', 0, true, level, xp, gems, selected_hero 
FROM public.users
ON CONFLICT (user_id, tower_id, floor) DO NOTHING;

-- 3. Copy the existing data from users into ALL existing rows of user_progress
UPDATE public.user_progress up
SET 
  level = u.level,
  xp = u.xp,
  gems = u.gems,
  selected_hero = u.selected_hero
FROM public.users u
WHERE up.user_id = u.id;

-- 4. Drop the columns from the users table
-- NOTE: If views or functions depend on these columns, those must be updated or dropped first!
ALTER TABLE public.users 
DROP COLUMN IF EXISTS level,
DROP COLUMN IF EXISTS xp,
DROP COLUMN IF EXISTS gems,
DROP COLUMN IF EXISTS selected_hero;
