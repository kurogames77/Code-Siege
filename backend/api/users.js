import express from 'express';
import supabase from '../lib/supabase.js';
import { supabaseService } from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users/search?q=<query>
 * Search for a user by student_id (exact) or username (partial, case-insensitive)
 * Uses service-role client to bypass RLS
 */
router.get('/search', authenticateUser, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const query = q.trim();
        const db = supabaseService || supabase;

        const { data, error } = await db
            .from('users')
            .select('id, username, student_id, avatar_url, xp, level, course')
            .or(`student_id.eq.${query},username.ilike.%${query}%`)
            .neq('id', req.user.id)
            .limit(1);

        if (error) {
            console.error('User search error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No user found' });
        }

        res.json({ user: data[0] });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/users/leaderboard
 * Get top users sorted by XP for leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { timeframe = 'weekly', limit = 50 } = req.query;

        // Fetch top users sorted by XP (descending)
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, avatar_url, level, xp')
            .order('xp', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Format leaderboard data
        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            id: user.id,
            name: user.username,
            avatar: user.avatar_url,
            score: user.xp || 0,
            level: user.level || 1
        }));

        res.json({ leaderboard, timeframe });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

/**
 * GET /api/users/:id
 * Get user profile by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !profile) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ profile });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * PATCH /api/users/:id
 * Update user profile (authenticated)
 */
router.patch('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, selected_hero, selected_theme, school, college, course, student_id, role, email, gender } = req.body;

        // Ensure user can only update their own profile
        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updates = {};
        if (username) updates.username = username;
        if (selected_hero) updates.selected_hero = selected_hero;
        if (selected_theme) updates.selected_theme = selected_theme;
        if (school !== undefined) updates.school = school;
        if (college !== undefined) updates.college = college;
        if (course !== undefined) updates.course = course;
        if (student_id !== undefined) updates.student_id = student_id;
        if (role !== undefined) updates.role = role;
        if (email !== undefined) updates.email = email;
        if (gender !== undefined) updates.gender = gender;

        const { data: profile, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * PATCH /api/users/:id/avatar
 * Update user avatar
 */
router.patch('/:id/avatar', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar_url } = req.body;

        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: profile, error } = await supabase
            .from('users')
            .update({ avatar_url })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Avatar updated', profile });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
});

/**
 * PATCH /api/users/:id/gems
 * Add or subtract gems
 */
router.patch('/:id/gems', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get current gems
        const { data: user } = await supabase
            .from('users')
            .select('gems')
            .eq('id', id)
            .single();

        const newGems = Math.max(0, (user?.gems || 0) + amount);

        const { data: profile, error } = await supabase
            .from('users')
            .update({ gems: newGems })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Gems updated', gems: newGems, profile });
    } catch (error) {
        console.error('Update gems error:', error);
        res.status(500).json({ error: 'Failed to update gems' });
    }
});

export default router;
