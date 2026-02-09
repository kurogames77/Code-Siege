import express from 'express';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/achievements
 * Get user's achievements
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data: achievements, error } = await supabase
            .from('achievements')
            .select('*')
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ achievements: achievements || [] });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ error: 'Failed to get achievements' });
    }
});

/**
 * POST /api/achievements/init
 * Initialize achievements for a new user
 */
router.post('/init', authenticateUser, async (req, res) => {
    try {
        // Default achievements
        const defaultAchievements = [
            { achievement_id: 'python_pathfinder', progress: 0, total: 1, status: 'locked', gem_reward: 2 },
            { achievement_id: 'python_enchanter', progress: 0, total: 10, status: 'locked', gem_reward: 3 },
            { achievement_id: 'grand_sorceres', progress: 0, total: 5, status: 'locked', gem_reward: 5 },
            { achievement_id: 'csharp_initiate', progress: 0, total: 1, status: 'locked', gem_reward: 2 },
            { achievement_id: 'csharp_spell_engineer', progress: 0, total: 5, status: 'locked', gem_reward: 4 },
            { achievement_id: 'csharp_system_architect', progress: 0, total: 10, status: 'locked', gem_reward: 5 },
            // Add more as needed
        ];

        const achievementsToInsert = defaultAchievements.map(a => ({
            ...a,
            user_id: req.user.id
        }));

        const { data, error } = await supabase
            .from('achievements')
            .upsert(achievementsToInsert, { onConflict: ['user_id', 'achievement_id'] })
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Achievements initialized', achievements: data });
    } catch (error) {
        console.error('Init achievements error:', error);
        res.status(500).json({ error: 'Failed to initialize achievements' });
    }
});

/**
 * PATCH /api/achievements/:achievementId
 * Update achievement progress
 */
router.patch('/:achievementId', authenticateUser, async (req, res) => {
    try {
        const { achievementId } = req.params;
        const { progress } = req.body;

        // Get current achievement
        const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('achievement_id', achievementId)
            .single();

        if (!achievement) {
            return res.status(404).json({ error: 'Achievement not found' });
        }

        const newProgress = Math.min(progress, achievement.total);
        const isCompleted = newProgress >= achievement.total;
        const wasCompleted = achievement.status === 'completed';

        const updates = {
            progress: newProgress,
            status: isCompleted ? 'completed' : newProgress > 0 ? 'in_progress' : 'locked'
        };

        if (isCompleted && !wasCompleted) {
            updates.unlocked_at = new Date().toISOString();

            // Award gems if newly completed
            if (achievement.gem_reward) {
                await supabase.rpc('add_gems', {
                    user_id_param: req.user.id,
                    amount_param: achievement.gem_reward
                });
            }
        }

        const { data: updated, error } = await supabase
            .from('achievements')
            .update(updates)
            .eq('id', achievement.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'Achievement updated',
            achievement: updated,
            newlyCompleted: isCompleted && !wasCompleted
        });
    } catch (error) {
        console.error('Update achievement error:', error);
        res.status(500).json({ error: 'Failed to update achievement' });
    }
});

export default router;
