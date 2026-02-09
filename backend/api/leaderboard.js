import express from 'express';
import supabase from '../lib/supabase.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/leaderboard
 * Get overall leaderboard
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        const { data: leaderboard, error } = await supabase
            .from('users')
            .select('id, username, avatar_url, level, xp')
            .order('xp', { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Add rank to each entry
        const rankedLeaderboard = leaderboard.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        // Find current user's rank if authenticated
        let userRank = null;
        if (req.user) {
            const userIndex = rankedLeaderboard.findIndex(u => u.id === req.user.id);
            if (userIndex >= 0) {
                userRank = userIndex + 1;
            }
        }

        res.json({
            leaderboard: rankedLeaderboard,
            userRank
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

/**
 * GET /api/leaderboard/weekly
 * Get weekly leaderboard (based on recent XP gains)
 */
router.get('/weekly', optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        // Get users with most XP (simplified - in production you'd track weekly gains)
        const { data: leaderboard, error } = await supabase
            .from('users')
            .select('id, username, avatar_url, level, xp')
            .order('xp', { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const rankedLeaderboard = leaderboard.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        res.json({ leaderboard: rankedLeaderboard });
    } catch (error) {
        console.error('Get weekly leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get weekly leaderboard' });
    }
});

/**
 * GET /api/leaderboard/tower/:towerId
 * Get leaderboard for specific tower
 */
router.get('/tower/:towerId', async (req, res) => {
    try {
        const { towerId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const { data: progress, error } = await supabase
            .from('user_progress')
            .select('user_id, score, users(username, avatar_url)')
            .eq('tower_id', towerId)
            .eq('completed', true)
            .order('score', { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const leaderboard = progress.map((entry, index) => ({
            rank: index + 1,
            username: entry.users?.username,
            avatar_url: entry.users?.avatar_url,
            score: entry.score
        }));

        res.json({ leaderboard });
    } catch (error) {
        console.error('Get tower leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get tower leaderboard' });
    }
});

export default router;
