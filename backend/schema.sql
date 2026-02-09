-- ============================================
-- CODE SIEGE DATABASE SCHEMA
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends auth.users)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER PROGRESS TABLE
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
-- ACHIEVEMENTS TABLE
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
-- CERTIFICATES TABLE
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
-- SHOP ITEMS TABLE
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
-- USER PURCHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- ============================================
-- BATTLES TABLE
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
-- INSTRUCTOR APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.instructor_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    instructor_id VARCHAR(50),
    department VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Progress policies
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);

-- Certificates policies
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own certificates" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can verify certificates" ON public.certificates FOR SELECT USING (true);

-- Shop items policies (public read)
CREATE POLICY "Anyone can view shop items" ON public.shop_items FOR SELECT USING (true);

-- Purchases policies
CREATE POLICY "Users can view own purchases" ON public.user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON public.user_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Battles policies
CREATE POLICY "Users can view own battles" ON public.battles FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users can create battles" ON public.battles FOR INSERT WITH CHECK (auth.uid() = player1_id);
CREATE POLICY "Participants can update battles" ON public.battles FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ============================================
-- SEED SHOP ITEMS
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

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to add gems to a user
CREATE OR REPLACE FUNCTION add_gems(user_id_param UUID, amount_param INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.users 
    SET gems = gems + amount_param 
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . s y s t e m _ l o g s   ( 
 
         i d   U U I D   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( )   P R I M A R Y   K E Y , 
 
         l e v e l   T E X T   N O T   N U L L   C H E C K   ( l e v e l   I N   ( ' I N F O ' ,   ' W A R N ' ,   ' E R R O R ' ) ) , 
 
         s o u r c e   T E X T   N O T   N U L L , 
 
         m e s s a g e   T E X T   N O T   N U L L , 
 
         m e t a d a t a   J S O N B   D E F A U L T   ' { } ' : : j s o n b , 
 
         c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   N O T   N U L L 
 
 ) ; 
 
 
 
 - -   E n a b l e   R L S 
 
 A L T E R   T A B L E   p u b l i c . s y s t e m _ l o g s   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 
 
 
 - -   P o l i c y :   A d m i n s   c a n   r e a d   a l l   l o g s 
 
 C R E A T E   P O L I C Y   " A d m i n s   c a n   v i e w   a l l   l o g s "   O N   p u b l i c . s y s t e m _ l o g s 
 
         F O R   S E L E C T   T O   a u t h e n t i c a t e d 
 
         U S I N G   ( E X I S T S   ( 
 
                 S E L E C T   1   F R O M   p u b l i c . u s e r s   
 
                 W H E R E   u s e r s . i d   =   a u t h . u i d ( )   A N D   u s e r s . r o l e   =   ' a d m i n ' 
 
         ) ) ; 
 
 
 
 - -   P o l i c y :   B a c k e n d / S e r v e r   f u n c t i o n s   k e y   c a n   i n s e r t   ( s i m u l a t i n g   t h i s   f o r   n o w   b y   a l l o w i n g   a n y   a u t h e n t i c a t e d   u s e r   t o   l o g   a c t i o n s   f o r   d e m o   p u r p o s e s ,   o r   b e t t e r ,   k e e p   i t   r e s t r i c t i v e ) 
 
 - -   F o r   t h i s   a p p ,   l e t ' s   a l l o w   a u t h e n t i c a t e d   u s e r s   t o   I N S E R T   l o g s   ( e . g .   c l i e n t   s i d e   e r r o r s )   b u t   o n l y   a d m i n s   c a n   V I E W . 
 
 C R E A T E   P O L I C Y   " U s e r s   c a n   i n s e r t   l o g s "   O N   p u b l i c . s y s t e m _ l o g s 
 
         F O R   I N S E R T   T O   a u t h e n t i c a t e d 
 
         W I T H   C H E C K   ( t r u e ) ; 
 
 
 
 
