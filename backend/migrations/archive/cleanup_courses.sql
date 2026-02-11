-- Remove legacy courses that don't match our new IDs
DELETE FROM public.courses 
WHERE id NOT IN ('py', 'cs', 'cpp', 'php', 'js', 'mysql');

-- Ensure the new courses have the correct metadata (just in case)
UPDATE public.courses SET icon_type = 'database' WHERE id = 'mysql';
UPDATE public.courses SET icon_type = 'server' WHERE id = 'py';
UPDATE public.courses SET icon_type = 'code' WHERE id = 'cs';
UPDATE public.courses SET icon_type = 'cpu' WHERE id = 'cpp';
UPDATE public.courses SET icon_type = 'globe' WHERE id = 'php';
UPDATE public.courses SET icon_type = 'layout' WHERE id = 'js';
