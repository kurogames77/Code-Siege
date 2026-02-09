import express from 'express';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/certificates
 * Get user's certificates
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data: certificates, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', req.user.id)
            .order('issued_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ certificates: certificates || [] });
    } catch (error) {
        console.error('Get certificates error:', error);
        res.status(500).json({ error: 'Failed to get certificates' });
    }
});

/**
 * POST /api/certificates
 * Issue a new certificate
 */
router.post('/', authenticateUser, async (req, res) => {
    try {
        const { course, grade, instructor } = req.body;

        if (!course || grade === undefined) {
            return res.status(400).json({ error: 'Course and grade are required' });
        }

        // Generate unique certificate ID
        const certificateId = `CS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const { data: certificate, error } = await supabase
            .from('certificates')
            .insert({
                user_id: req.user.id,
                course,
                grade,
                instructor: instructor || 'Code Siege Academy',
                certificate_id: certificateId,
                issued_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Certificate issued', certificate });
    } catch (error) {
        console.error('Issue certificate error:', error);
        res.status(500).json({ error: 'Failed to issue certificate' });
    }
});

/**
 * GET /api/certificates/:id
 * Get specific certificate
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: certificate, error } = await supabase
            .from('certificates')
            .select('*, users(username)')
            .eq('id', id)
            .single();

        if (error || !certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({ certificate });
    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({ error: 'Failed to get certificate' });
    }
});

/**
 * GET /api/certificates/verify/:certificateId
 * Verify a certificate by its public ID
 */
router.get('/verify/:certificateId', async (req, res) => {
    try {
        const { certificateId } = req.params;

        const { data: certificate, error } = await supabase
            .from('certificates')
            .select('*, users(username)')
            .eq('certificate_id', certificateId)
            .single();

        if (error || !certificate) {
            return res.status(404).json({
                valid: false,
                error: 'Certificate not found'
            });
        }

        res.json({
            valid: true,
            certificate: {
                course: certificate.course,
                grade: certificate.grade,
                username: certificate.users?.username,
                issued_at: certificate.issued_at,
                certificate_id: certificate.certificate_id
            }
        });
    } catch (error) {
        console.error('Verify certificate error:', error);
        res.status(500).json({ error: 'Failed to verify certificate' });
    }
});

export default router;
