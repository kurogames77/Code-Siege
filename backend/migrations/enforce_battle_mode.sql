-- Migration: enforce_battle_mode.sql
-- Description: Updates existing battle modes and adds a CHECK constraint to ensure only valid modes are used.

-- 1. Migrate existing data
UPDATE public.battles
SET mode = '1v1 duel'
WHERE mode = 'duel' OR mode IS NULL OR mode = '';

UPDATE public.battles
SET mode = 'Multiplayer battle'
WHERE mode = 'multiplayer' OR mode = 'Multiplayer';

-- 2. (Optional) Add a check constraint to enforce these two exact strings
-- Note: If you ever play to add more modes, you'll need to drop and recreate this constraint
ALTER TABLE public.battles
ADD CONSTRAINT check_valid_battle_mode 
CHECK (mode IN ('1v1 duel', 'Multiplayer battle'));
