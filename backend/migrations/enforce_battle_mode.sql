-- Migration: enforce_battle_mode.sql
-- Description: Updates existing battle modes and adds a CHECK constraint to ensure only valid modes are used.

-- 1. Drop the old conflicting constraint
ALTER TABLE public.battles
DROP CONSTRAINT IF EXISTS battles_mode_check;

-- 2. Migrate existing data to the new formats
UPDATE public.battles
SET mode = '1v1 duel'
WHERE mode = 'duel' OR mode IS NULL OR mode = '';

UPDATE public.battles
SET mode = 'Multiplayer battle'
WHERE mode = 'multiplayer' OR mode = 'Multiplayer';

-- 3. Add the new constraint with the exact requested strings
ALTER TABLE public.battles
ADD CONSTRAINT check_valid_battle_mode 
CHECK (mode IN ('1v1 duel', 'Multiplayer battle'));
