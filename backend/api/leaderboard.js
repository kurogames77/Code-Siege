import express from 'express';
import { supabaseService, supabase as supabaseDefault } from '../lib/supabase.js';

const supabase = supabaseService || supabaseDefault;
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/leaderboard
 * Get overall leaderboard
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        const { data: progress, error } = await supabase
            .from('user_progress')
            .select('level, xp, users(id, username, avatar_url, role)')
            .eq('tower_id', 'global')
            .order('xp', { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const isEligible = (role) => {
            const r = (role || 'student').toLowerCase();
            return ['student', 'guest', 'user'].includes(r);
        };

        const filteredProgress = progress.filter(entry => entry.users?.id && isEligible(entry.users?.role));

        // Also fetch ALL users to include those without a global progress row, then filter
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, username, avatar_url, role');

        // Merge: users with progress + users without progress (0 XP)
        const progressUserIds = new Set(filteredProgress.map(e => e.users?.id));
        const usersWithoutProgress = (allUsers || []).filter(u => u.id && !progressUserIds.has(u.id) && isEligible(u.role));

        // Fetch battles to compute battles won
        const { data: battles } = await supabase
            .from('battles')
            .select('winner_id')
            .not('winner_id', 'is', null);

        const winsMap = new Map();
        battles?.forEach(b => {
             const wid = b.winner_id;
             if (wid) {
                 winsMap.set(wid, (winsMap.get(wid) || 0) + 1);
             }
        });

        // Add rank to each entry — map to field names the frontend expects
        const rankedFromProgress = filteredProgress.map(entry => ({
            id: entry.users?.id,
            name: entry.users?.username,
            username: entry.users?.username,
            avatar: entry.users?.avatar_url,
            avatar_url: entry.users?.avatar_url,
            level: entry.level,
            xp: entry.xp,
            score: entry.xp,
            battles_won: winsMap.get(entry.users?.id) || 0,
            rank: 0 // will be set below
        }));

        const rankedFromUsers = usersWithoutProgress.map(u => ({
            id: u.id,
            name: u.username,
            username: u.username,
            avatar: u.avatar_url,
            avatar_url: u.avatar_url,
            level: 1,
            xp: 0,
            score: 0,
            battles_won: winsMap.get(u.id) || 0,
            rank: 0
        }));

        const combined = [...rankedFromProgress, ...rankedFromUsers];
        combined.sort((a, b) => b.xp - a.xp);
        const rankedLeaderboard = combined.map((entry, index) => ({ ...entry, rank: index + 1 }));

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
        const { data: progress, error } = await supabase
            .from('user_progress')
            .select('level, xp, users(id, username, avatar_url, role)')
            .eq('tower_id', 'global')
            .order('xp', { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const isEligible = (role) => {
            const r = (role || 'student').toLowerCase();
            return ['student', 'guest', 'user'].includes(r);
        };

        const filteredProgress = progress.filter(entry => entry.users?.id && isEligible(entry.users?.role));

        // Also fetch ALL users to include those without a global progress row, then filter
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, username, avatar_url, role');

        // Merge: users with progress + users without progress (0 XP)
        const progressUserIds = new Set(filteredProgress.map(e => e.users?.id));
        const usersWithoutProgress = (allUsers || []).filter(u => u.id && !progressUserIds.has(u.id) && isEligible(u.role));

        // Fetch battles to compute battles won
        const { data: battles } = await supabase
            .from('battles')
            .select('winner_id')
            .not('winner_id', 'is', null);

        const winsMap = new Map();
        battles?.forEach(b => {
             const wid = b.winner_id;
             if (wid) {
                 winsMap.set(wid, (winsMap.get(wid) || 0) + 1);
             }
        });

        const rankedFromProgress = filteredProgress.map(entry => ({
            id: entry.users?.id,
            name: entry.users?.username,
            username: entry.users?.username,
            avatar: entry.users?.avatar_url,
            avatar_url: entry.users?.avatar_url,
            level: entry.level,
            xp: entry.xp,
            score: entry.xp,
            battles_won: winsMap.get(entry.users?.id) || 0,
            rank: 0
        }));

        const rankedFromUsers = usersWithoutProgress.map(u => ({
            id: u.id,
            name: u.username,
            username: u.username,
            avatar: u.avatar_url,
            avatar_url: u.avatar_url,
            level: 1,
            xp: 0,
            score: 0,
            battles_won: winsMap.get(u.id) || 0,
            rank: 0
        }));

        const combined = [...rankedFromProgress, ...rankedFromUsers];
        combined.sort((a, b) => b.xp - a.xp);
        const rankedLeaderboard = combined.map((entry, index) => ({ ...entry, rank: index + 1 }));

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
