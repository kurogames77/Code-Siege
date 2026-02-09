import express from 'express';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/battles
 * Get user's battle history
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data: battles, error } = await supabase
            .from('battles')
            .select(`
                *,
                player1:player1_id(id, username, avatar_url),
                player2:player2_id(id, username, avatar_url),
                winner:winner_id(id, username)
            `)
            .or(`player1_id.eq.${req.user.id},player2_id.eq.${req.user.id}`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ battles: battles || [] });
    } catch (error) {
        console.error('Get battles error:', error);
        res.status(500).json({ error: 'Failed to get battles' });
    }
});

/**
 * POST /api/battles/create
 * Create a new battle
 */
router.post('/create', authenticateUser, async (req, res) => {
    try {
        const { mode, opponent_id } = req.body;

        const battleData = {
            player1_id: req.user.id,
            mode: mode || 'duel',
            status: 'pending',
            created_at: new Date().toISOString()
        };

        if (opponent_id) {
            battleData.player2_id = opponent_id;
        }

        const { data: battle, error } = await supabase
            .from('battles')
            .insert(battleData)
            .select(`
                *,
                player1:player1_id(id, username, avatar_url)
            `)
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Battle created', battle });
    } catch (error) {
        console.error('Create battle error:', error);
        res.status(500).json({ error: 'Failed to create battle' });
    }
});

/**
 * PATCH /api/battles/:id/join
 * Join a battle
 */
router.patch('/:id/join', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: battle } = await supabase
            .from('battles')
            .select('*')
            .eq('id', id)
            .single();

        if (!battle) {
            return res.status(404).json({ error: 'Battle not found' });
        }

        if (battle.status !== 'pending') {
            return res.status(400).json({ error: 'Battle is not available' });
        }

        if (battle.player1_id === req.user.id) {
            return res.status(400).json({ error: 'Cannot join your own battle' });
        }

        const { data: updated, error } = await supabase
            .from('battles')
            .update({
                player2_id: req.user.id,
                status: 'active'
            })
            .eq('id', id)
            .select(`
                *,
                player1:player1_id(id, username, avatar_url),
                player2:player2_id(id, username, avatar_url)
            `)
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Joined battle', battle: updated });
    } catch (error) {
        console.error('Join battle error:', error);
        res.status(500).json({ error: 'Failed to join battle' });
    }
});

/**
 * PATCH /api/battles/:id/complete
 * Complete a battle with winner
 */
router.patch('/:id/complete', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { winner_id, player1_score, player2_score } = req.body;

        const { data: battle } = await supabase
            .from('battles')
            .select('*')
            .eq('id', id)
            .single();

        if (!battle) {
            return res.status(404).json({ error: 'Battle not found' });
        }

        // Verify user is a participant
        if (battle.player1_id !== req.user.id && battle.player2_id !== req.user.id) {
            return res.status(403).json({ error: 'Not a participant' });
        }

        const { data: updated, error } = await supabase
            .from('battles')
            .update({
                winner_id,
                player1_score,
                player2_score,
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                player1:player1_id(id, username, avatar_url),
                player2:player2_id(id, username, avatar_url),
                winner:winner_id(id, username)
            `)
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Award XP to winner
        if (winner_id) {
            await supabase
                .from('users')
                .update({ xp: supabase.raw('xp + 50') })
                .eq('id', winner_id);
        }

        res.json({ message: 'Battle completed', battle: updated });
    } catch (error) {
        console.error('Complete battle error:', error);
        res.status(500).json({ error: 'Failed to complete battle' });
    }
});

export default router;
