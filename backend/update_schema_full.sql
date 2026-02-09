-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'py', 'js', 'cpp'
    name VARCHAR(100) NOT NULL,
    icon_type VARCHAR(50) DEFAULT 'code',
    color VARCHAR(20) DEFAULT 'blue',
    difficulty VARCHAR(20) DEFAULT 'Beginner',
    mode VARCHAR(20) DEFAULT 'Standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read courses" ON public.courses;
CREATE POLICY "Anyone can read courses" ON public.courses 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Instructors can manage courses" ON public.courses;
CREATE POLICY "Instructors can manage courses" ON public.courses 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'admin')
        )
    );

-- ============================================
-- COURSE LEVELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.course_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id VARCHAR(50) NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    level_order INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    initial_code TEXT,
    expected_output TEXT,
    solution TEXT,
    hints JSONB DEFAULT '[]'::jsonb,
    rewards JSONB DEFAULT '{"exp": 100, "coins": 50}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, level_order)
);

-- RLS Policies for levels
ALTER TABLE public.course_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read course levels" ON public.course_levels;
CREATE POLICY "Anyone can read course levels" ON public.course_levels 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Instructors can manage levels" ON public.course_levels;
CREATE POLICY "Instructors can manage levels" ON public.course_levels 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'admin')
        )
    );

-- ============================================
-- SEED INITIAL COURSES
-- ============================================
INSERT INTO public.courses (id, name, icon_type, color, difficulty, mode) VALUES
    ('py', 'Python', 'server', 'blue', 'Beginner', 'Standard'),
    ('cs', 'C#', 'code', 'purple', 'Intermediate', 'System'),
    ('cpp', 'C++', 'cpu', 'red', 'Advanced', 'System'),
    ('php', 'PHP', 'globe', 'indigo', 'Intermediate', 'Web'),
    ('js', 'JavaScript', 'layout', 'yellow', 'Beginner', 'Web'),
    ('mysql', 'MySQL', 'database', 'orange', 'Intermediate', 'Database')
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    icon_type = EXCLUDED.icon_type,
    color = EXCLUDED.color,
    difficulty = EXCLUDED.difficulty,
    mode = EXCLUDED.mode;
