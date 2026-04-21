import express from 'express';
import { supabaseService } from '../lib/supabase.js';

const router = express.Router();

// Submit a new manual payment (from player)
router.post('/manual', async (req, res) => {
    try {
        const { userId, amount, gems, method, referenceNumber } = req.body;

        if (!userId || !amount || !gems || !referenceNumber) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Validate exactly 13 digits for GCash
        if (method === 'gcash' && !/^\d{13}$/.test(referenceNumber)) {
            return res.status(400).json({ error: 'GCash Reference Number must be exactly 13 digits.' });
        }

        const { data, error } = await supabaseService
            .from('manual_payments')
            .insert([{
                user_id: userId,
                amount: parseInt(amount),
                gems: parseInt(gems),
                method: method || 'gcash',
                reference_number: referenceNumber,
                status: 'pending'
            }])
            .select('*')
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'This reference number has already been submitted.' });
            }
            throw error;
        }

        res.json({ success: true, payment: data });
    } catch (error) {
        console.error('[Payments API] Error submitting manual payment:', error);
        res.status(500).json({ error: 'Failed to submit payment.' });
    }
});

// Admin: Get all pending payments
router.get('/manual', async (req, res) => {
    try {
        const { status, role } = req.query; // optional filters
        
        // Use explicit FK name because manual_payments has two FKs to users (user_id + admin_id)
        const useInner = !!role; // inner join only when filtering by role
        const joinHint = useInner
            ? 'users!manual_payments_user_id_fkey!inner'
            : 'users!manual_payments_user_id_fkey';

        let query = supabaseService
            .from('manual_payments')
            .select(`
                *,
                ${joinHint} (username, email, role)
            `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (role) {
            if (role === 'student') {
                query = query.in('users.role', ['student', 'user']);
            } else {
                query = query.eq('users.role', role);
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('[Payments API] Error fetching manual payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments.' });
    }
});

// Admin: Approve or Reject payment
router.patch('/manual/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminId } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // 1. Get the payment to check its current status & gems
        const { data: payment, error: fetchError } = await supabaseService
            .from('manual_payments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'Payment is already processed' });
        }

        // 2. Update the status atomically
        const { data: updateData, error: updateError } = await supabaseService
            .from('manual_payments')
            .update({ 
                status, 
                admin_id: adminId, 
                updated_at: new Date() 
            })
            .eq('id', id)
            .eq('status', 'pending')
            .select();

        if (updateError) throw updateError;
        
        if (!updateData || updateData.length === 0) {
            return res.status(400).json({ error: 'Payment has already been processed' });
        }

        // 3. If approved, add gems to user_progress (global row)
        if (status === 'approved') {
            try {
                // Gems are stored in user_progress where tower_id = 'global'
                const { data: progress, error: progressError } = await supabaseService
                    .from('user_progress')
                    .select('id, gems')
                    .eq('user_id', payment.user_id)
                    .eq('tower_id', 'global')
                    .single();

                if (progressError || !progress) {
                    console.error('[Payments API] Could not find user_progress global row:', progressError);
                } else {
                    const newGems = (progress.gems || 0) + payment.gems;
                    const { error: updateGemsError } = await supabaseService
                        .from('user_progress')
                        .update({ gems: newGems })
                        .eq('id', progress.id);

                    if (updateGemsError) {
                        console.error('[Payments API] Error updating gems:', updateGemsError);
                    } else {
                        console.log(`[Payments API] Added ${payment.gems} gems to user ${payment.user_id}. New total: ${newGems}`);
                    }
                }
            } catch (gemErr) {
                console.error('[Payments API] Gem credit failed:', gemErr);
            }
        }

        res.json({ success: true, message: `Payment ${status}` });
    } catch (error) {
        console.error('[Payments API] Error updating manual payment:', error);
        res.status(500).json({ error: 'Failed to update payment status.' });
    }
});

export default router;
