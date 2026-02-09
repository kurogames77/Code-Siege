import express from 'express';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/progress
 * Get user's tower progress
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data: progress, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', req.user.id)
            .order('tower_id')
            .order('floor');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ progress: progress || [] });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

/**
 * POST /api/progress/complete
 * Mark a floor as completed
 */
router.post('/complete', authenticateUser, async (req, res) => {
    try {
        const { tower_id, floor } = req.body;

        if (!tower_id || floor === undefined) {
            return res.status(400).json({ error: 'Tower ID and floor are required' });
        }

        // Check if already exists
        const { data: existing } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('tower_id', tower_id)
            .eq('floor', floor)
            .single();

        let result;
        if (existing) {
            // Already completed, just return existing record
            result = { data: existing };
        } else {
            // Insert new
            result = await supabase
                .from('user_progress')
                .insert({
                    user_id: req.user.id,
                    tower_id,
                    floor,
                    completed: true,
                    completed_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) {
            return res.status(400).json({ error: result.error.message });
        }

        res.json({ message: 'Progress updated', progress: result.data });
    } catch (error) {
        console.error('Complete floor error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

/**
 * PATCH /api/progress/xp
 * Add XP to user
 */
router.patch('/xp', authenticateUser, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid XP amount required' });
        }

        // Get current user stats
        const { data: user } = await supabase
            .from('users')
            .select('xp, level')
            .eq('id', req.user.id)
            .single();

        const newXp = (user?.xp || 0) + amount;

        // Calculate level (100 XP per level)
        const newLevel = Math.floor(newXp / 100) + 1;
        const leveledUp = newLevel > (user?.level || 1);

        const { data: profile, error } = await supabase
            .from('users')
            .update({ xp: newXp, level: newLevel })
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'XP added',
            xp: newXp,
            level: newLevel,
            leveledUp,
            profile
        });
    } catch (error) {
        console.error('Add XP error:', error);
        res.status(500).json({ error: 'Failed to add XP' });
    }
});

export default router;
