-- Migration: update_battles_for_multiplayer.sql
-- Description: Removes score columns and adds support for up to 5 players per battle.

-- 1. Drop the unused score columns
ALTER TABLE public.battles
DROP COLUMN IF EXISTS player1_score,
DROP COLUMN IF EXISTS player2_score;

-- 2. Add player 3 to 5 columns
ALTER TABLE public.battles
ADD COLUMN IF NOT EXISTS player3_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS player4_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS player5_id UUID REFERENCES public.users(id);

-- Optional: If you want to update any views or RPCs that depended on these columns, 
-- you would drop and recreate them here.
