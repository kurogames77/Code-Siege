-- ============================================
-- CODE SIEGE DATABASE SCHEMA (CONSOLIDATED)
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin', 'user')),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    gems INTEGER DEFAULT 0,
    selected_hero VARCHAR(20) DEFAULT '3',
    selected_theme VARCHAR(50) DEFAULT 'default',
    is_banned BOOLEAN DEFAULT FALSE,
    active_session_id UUID,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'py', 'js', 'cpp'
    name VARCHAR(100) NOT NULL,
    icon_type VARCHAR(50) DEFAULT 'code',
    color VARCHAR(20) DEFAULT 'blue',
    difficulty VARCHAR(20) DEFAULT 'Beginner',
    mode VARCHAR(20) DEFAULT 'Standard',
    instructor_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. COURSE LEVELS TABLE
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
    
    -- New columns from upgrades
    course_mode TEXT DEFAULT 'Beginner',
    difficulty_level TEXT DEFAULT 'Easy',
    initial_blocks JSONB DEFAULT '[]'::jsonb,
    correct_sequence JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite Unique Constraint
    CONSTRAINT course_levels_unique_category_order UNIQUE (course_id, course_mode, difficulty_level, level_order)
);

-- ============================================
-- 4. USER PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tower_id VARCHAR(50) NOT NULL,
    floor INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tower_id, floor)
);

-- ============================================
-- 5. ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL,
    progress INTEGER DEFAULT 0,
    total INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed')),
    gem_reward INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 6. CERTIFICATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    certificate_id VARCHAR(50) UNIQUE NOT NULL,
    instructor VARCHAR(100) DEFAULT 'Code Siege Academy',
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. SHOP ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bundle', 'hero', 'theme', 'consumable')),
    price INTEGER NOT NULL,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. USER PURCHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- ============================================
-- 9. BATTLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.battles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    mode VARCHAR(20) DEFAULT 'duel' CHECK (mode IN ('duel', 'multiplayer', 'tournament')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    player1_score INTEGER,
    player2_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 10. INSTRUCTOR APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.instructor_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL, 
    student_id TEXT,
    course TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id),
    rejection_reason TEXT
);

-- ============================================
-- 11. SYSTEM LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_tower ON public.user_progress(tower_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_battles_players ON public.battles(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_users_xp ON public.users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_applications_status ON public.instructor_applications(status);
CREATE INDEX IF NOT EXISTS idx_instructor_applications_email ON public.instructor_applications(email);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- COURSES
CREATE POLICY "Anyone can read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Instructors can manage courses" ON public.courses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin'))
);

-- COURSE LEVELS
CREATE POLICY "Anyone can read course levels" ON public.course_levels FOR SELECT USING (true);
CREATE POLICY "Instructors can insert levels" ON public.course_levels FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin'))
);
CREATE POLICY "Instructors can update levels" ON public.course_levels FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin'))
);
CREATE POLICY "Instructors can delete levels" ON public.course_levels FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin'))
);

-- INSTRUCTOR APPLICATIONS
CREATE POLICY "Admins can view applications" ON public.instructor_applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'instructor'))
);
CREATE POLICY "Anyone can apply" ON public.instructor_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update applications" ON public.instructor_applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- SYSTEM LOGS
CREATE POLICY "Admins can view all logs" ON public.system_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Users can insert logs" ON public.system_logs FOR INSERT WITH CHECK (true);

-- PROGRESS, ACHIEVEMENTS, CERTIFICATES, PURCHASES, BATTLES (Standard User Policies)
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own certificates" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can verify certificates" ON public.certificates FOR SELECT USING (true);

CREATE POLICY "Anyone can view shop items" ON public.shop_items FOR SELECT USING (true);

CREATE POLICY "Users can view own purchases" ON public.user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON public.user_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own battles" ON public.battles FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users can create battles" ON public.battles FOR INSERT WITH CHECK (auth.uid() = player1_id);
CREATE POLICY "Participants can update battles" ON public.battles FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO public.shop_items (name, type, price, description) VALUES
    ('Christmas Holiday Bundle', 'bundle', 500, 'Festive theme with snow effects'),
    ('Spooky Halloween Bundle', 'bundle', 500, 'Scary theme with dark effects'),
    ('Winter Frost Bundle', 'bundle', 500, 'Cool theme with ice effects'),
    ('Hero: Ignis', 'hero', 300, 'Fire mage hero'),
    ('Hero: Daemon', 'hero', 300, 'Dark warrior hero'),
    ('Hero: Valerius', 'hero', 0, 'Default knight hero'),
    ('Hero: Nyx', 'hero', 300, 'Shadow assassin hero')
ON CONFLICT DO NOTHING;

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

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION add_gems(user_id_param UUID, amount_param INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.users 
    SET gems = gems + amount_param 
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
