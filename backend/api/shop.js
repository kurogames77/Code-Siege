import express from 'express';
import { supabase, supabaseService } from '../lib/supabase.js';
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

/**
 * POST /api/shop/purchase-theme
 * Purchase a theme using gems from user_progress (global row)
 */
router.post('/purchase-theme', authenticateUser, async (req, res) => {
    try {
        const { themeId, price } = req.body;
        const userId = req.user.id;

        const validThemes = ['winter', 'christmas', 'spooky'];
        if (!validThemes.includes(themeId)) {
            return res.status(400).json({ error: 'Invalid theme ID' });
        }
        if (!price || price < 0) {
            return res.status(400).json({ error: 'Invalid price' });
        }

        const db = supabaseService || supabase;

        // Check if already purchased
        const { data: existing } = await db
            .from('user_purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('remarks', `theme:${themeId}`)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'Theme already purchased' });
        }

        // Get user gems from user_progress (global row)
        const { data: progress, error: progressError } = await db
            .from('user_progress')
            .select('id, gems')
            .eq('user_id', userId)
            .eq('tower_id', 'global')
            .single();

        if (progressError || !progress) {
            return res.status(400).json({ error: 'Could not find user progress' });
        }

        if ((progress.gems || 0) < price) {
            return res.status(400).json({ error: 'Insufficient gems' });
        }

        // Deduct gems
        const newGems = progress.gems - price;
        const { error: deductError } = await db
            .from('user_progress')
            .update({ gems: newGems })
            .eq('id', progress.id);

        if (deductError) {
            return res.status(500).json({ error: 'Failed to deduct gems' });
        }

        // Record purchase in user_purchases
        const { error: insertError } = await db
            .from('user_purchases')
            .insert({
                user_id: userId,
                remarks: `theme:${themeId}`
            });

        if (insertError) {
            // Refund gems on error
            await db.from('user_progress').update({ gems: progress.gems }).eq('id', progress.id);
            return res.status(500).json({ error: 'Failed to record purchase' });
        }

        // Auto-equip the theme
        await db.from('users').update({ selected_theme: themeId }).eq('id', userId);

        console.log(`[Shop] User ${userId} purchased theme '${themeId}' for ${price} gems. Remaining: ${newGems}`);

        res.json({
            success: true,
            message: `Theme '${themeId}' purchased successfully`,
            remaining_gems: newGems,
            equipped: themeId
        });
    } catch (error) {
        console.error('Purchase theme error:', error);
        res.status(500).json({ error: 'Failed to purchase theme' });
    }
});

/**
 * GET /api/shop/purchased-themes
 * Get list of theme IDs the user has purchased
 */
router.get('/purchased-themes', authenticateUser, async (req, res) => {
    try {
        const db = supabaseService || supabase;
        const { data, error } = await db
            .from('user_purchases')
            .select('remarks')
            .eq('user_id', req.user.id)
            .like('remarks', 'theme:%');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Extract theme IDs from "theme:winter" format
        const purchasedThemes = (data || []).map(r => r.remarks.replace('theme:', ''));
        res.json({ purchasedThemes });
    } catch (error) {
        console.error('Get purchased themes error:', error);
        res.status(500).json({ error: 'Failed to get purchased themes' });
    }
});

/**
 * PATCH /api/shop/equip-theme
 * Equip a purchased theme (or default)
 */
router.patch('/equip-theme', authenticateUser, async (req, res) => {
    try {
        const { themeId } = req.body;
        const db = supabaseService || supabase;

        // Allow default theme without purchase check
        if (themeId !== 'default') {
            const { data: purchase } = await db
                .from('user_purchases')
                .select('id')
                .eq('user_id', req.user.id)
                .eq('remarks', `theme:${themeId}`)
                .maybeSingle();

            if (!purchase) {
                return res.status(403).json({ error: 'Theme not purchased' });
            }
        }

        const { error } = await db
            .from('users')
            .update({ selected_theme: themeId })
            .eq('id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, equipped: themeId });
    } catch (error) {
        console.error('Equip theme error:', error);
        res.status(500).json({ error: 'Failed to equip theme' });
    }
});

export default router;
