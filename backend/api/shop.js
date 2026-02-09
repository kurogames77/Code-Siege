import express from 'express';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/shop
 * Get all shop items
 */
router.get('/', async (req, res) => {
    try {
        const { data: items, error } = await supabase
            .from('shop_items')
            .select('*')
            .order('type')
            .order('price');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ items: items || [] });
    } catch (error) {
        console.error('Get shop items error:', error);
        res.status(500).json({ error: 'Failed to get shop items' });
    }
});

/**
 * GET /api/shop/inventory
 * Get user's purchased items
 */
router.get('/inventory', authenticateUser, async (req, res) => {
    try {
        const { data: purchases, error } = await supabase
            .from('user_purchases')
            .select('*, shop_items(*)')
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ inventory: purchases || [] });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Failed to get inventory' });
    }
});

/**
 * POST /api/shop/purchase
 * Purchase an item
 */
router.post('/purchase', authenticateUser, async (req, res) => {
    try {
        const { item_id } = req.body;

        if (!item_id) {
            return res.status(400).json({ error: 'Item ID is required' });
        }

        // Get item
        const { data: item } = await supabase
            .from('shop_items')
            .select('*')
            .eq('id', item_id)
            .single();

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Check if already purchased
        const { data: existing } = await supabase
            .from('user_purchases')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('item_id', item_id)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Item already purchased' });
        }

        // Get user gems
        const { data: user } = await supabase
            .from('users')
            .select('gems')
            .eq('id', req.user.id)
            .single();

        if ((user?.gems || 0) < item.price) {
            return res.status(400).json({ error: 'Insufficient gems' });
        }

        // Deduct gems
        await supabase
            .from('users')
            .update({ gems: user.gems - item.price })
            .eq('id', req.user.id);

        // Record purchase
        const { data: purchase, error } = await supabase
            .from('user_purchases')
            .insert({
                user_id: req.user.id,
                item_id,
                purchased_at: new Date().toISOString()
            })
            .select('*, shop_items(*)')
            .single();

        if (error) {
            // Refund gems on error
            await supabase
                .from('users')
                .update({ gems: user.gems })
                .eq('id', req.user.id);
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Purchase successful',
            purchase,
            remaining_gems: user.gems - item.price
        });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Purchase failed' });
    }
});

export default router;
