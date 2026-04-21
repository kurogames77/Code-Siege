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
        
        let query = supabaseService
            .from('manual_payments')
            .select(`
                *,
                users!inner (username, email, role)
            `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (role) {
            query = query.eq('users.role', role);
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

        // 3. If approved, add gems using the RPC function
        if (status === 'approved') {
            const { error: rpcError } = await supabaseService.rpc('add_gems', {
                user_id_param: payment.user_id,
                amount_param: payment.gems
            });
            
            if (rpcError) {
                console.error('[Payments API] Error adding gems via RPC:', rpcError);
                // Attempt direct update as fallback
                const { data: user, error: userError } = await supabaseService.from('users').select('gems').eq('id', payment.user_id).single();
                if(!userError && user){
                    await supabaseService.from('users').update({ gems: user.gems + payment.gems }).eq('id', payment.user_id);
                }
            }
        }

        res.json({ success: true, message: `Payment ${status}` });
    } catch (error) {
        console.error('[Payments API] Error updating manual payment:', error);
        res.status(500).json({ error: 'Failed to update payment status.' });
    }
});

export default router;
