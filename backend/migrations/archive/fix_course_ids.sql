-- Fix course ID mismatches to enable tower unlocking
-- This version handles cases where the target ID (e.g. 'py') already exists
DO $$
BEGIN
    -- Handle Python (pyt -> py)
    IF EXISTS (SELECT 1 FROM public.courses WHERE id = 'pyt') THEN
        IF EXISTS (SELECT 1 FROM public.courses WHERE id = 'py') THEN
            -- If 'py' exists, move levels from 'pyt' to 'py' and delete 'pyt'
            UPDATE public.course_levels SET course_id = 'py' WHERE course_id = 'pyt';
            DELETE FROM public.courses WHERE id = 'pyt';
        ELSE
            -- If 'py' doesn't exist, just rename 'pyt'
            UPDATE public.courses SET id = 'py' WHERE id = 'pyt';
            UPDATE public.course_levels SET course_id = 'py' WHERE course_id = 'pyt';
        END IF;
    END IF;

    -- Handle JavaScript (jav -> js)
    IF EXISTS (SELECT 1 FROM public.courses WHERE id = 'jav') THEN
        IF EXISTS (SELECT 1 FROM public.courses WHERE id = 'js') THEN
            UPDATE public.course_levels SET course_id = 'js' WHERE course_id = 'jav';
            DELETE FROM public.courses WHERE id = 'jav';
        ELSE
            UPDATE public.courses SET id = 'js' WHERE id = 'jav';
            UPDATE public.course_levels SET course_id = 'js' WHERE course_id = 'jav';
        END IF;
    END IF;

    -- Handle MySQL (mys -> mysql)
    IF EXISTS (SELECT 1 FROM public.courses WHERE id = 'mys') THEN
        IF EXISTS (SELECT 1 FROM public.courses WHERE id = 'mysql') THEN
            UPDATE public.course_levels SET course_id = 'mysql' WHERE course_id = 'mys';
            DELETE FROM public.courses WHERE id = 'mys';
        ELSE
            UPDATE public.courses SET id = 'mysql' WHERE id = 'mys';
            UPDATE public.course_levels SET course_id = 'mysql' WHERE course_id = 'mys';
        END IF;
    END IF;
END $$;
