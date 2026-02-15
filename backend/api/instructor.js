import express from 'express';
import supabase, { getAuthenticatedClient, supabaseService } from '../lib/supabase.js';
import { authenticateUser, requireInstructor, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication + instructor role
router.use(authenticateUser);
router.use(requireInstructor);

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * GET /api/instructor/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // PERF: Use RPC for single-query stats
        const { data: stats, error } = await supabase.rpc('get_instructor_dashboard_stats');

        if (error) {
            console.error('RPC Stats Error (falling back):', error);
            // Fallback to basic counts if RPC not exists
            return res.json({
                totalStudents: 0,
                totalInstructors: 0,
                totalApplications: 0,
                totalBattles: 0,
                totalCertificates: 0,
                newUsersThisWeek: 0,
                instructorActivity: []
            });
        }

        res.json(stats);
    } catch (error) {
        console.error('Failed to fetch dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// ============================================
// INSTRUCTOR APPLICATION MANAGEMENT
// ============================================

/**
 * GET /api/instructor/applications
 * Get all pending instructor applications
 */
router.get('/applications', async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const { data: applications, error } = await supabaseService
            .from('instructor_applications')
            .select('id, username, email, student_id, course, status, created_at')
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get applications error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ applications: applications || [] });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ error: 'Failed to get applications' });
    }
});

/**
 * POST /api/instructor/applications/:id/approve
 * Approve an instructor application and create the user account
 */
router.post('/applications/:id/approve', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization.split(' ')[1];
        const authSupabase = getAuthenticatedClient(token);

        // Get the application
        const { data: application, error: fetchError } = await authSupabase
            .from('instructor_applications')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status !== 'pending') {
            return res.status(400).json({ error: `Application already ${application.status}` });
        }

        // Create the auth user using Supabase Admin API (service role)
        const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
            email: application.email,
            password: application.password_hash,
            email_confirm: false, // Will send confirmation email
            user_metadata: {
                username: application.username
            }
        });

        if (authError) {
            console.error('Create user error:', authError);
            return res.status(400).json({ error: `Failed to create user: ${authError.message}` });
        }

        // Create or update user profile in users table
        // Use upsert in case a database trigger already created a skeleton profile
        const { data: profile, error: profileError } = await supabaseService
            .from('users')
            .upsert({
                id: authData.user.id,
                username: application.username,
                email: application.email,
                student_id: application.student_id || null,
                course: application.course || null,
                role: 'instructor',
                level: 1,
                xp: 0,
                gems: 0,
                selected_hero: '3',
                selected_theme: 'default'
            }, {
                onConflict: 'id'
            })
            .select()
            .single();

        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Try to clean up the auth user
            await supabaseService.auth.admin.deleteUser(authData.user.id);
            return res.status(400).json({ error: `Failed to create user profile: ${profileError.message}` });
        }

        // Send invite email so user can confirm
        const { error: inviteError } = await supabaseService.auth.admin.inviteUserByEmail(application.email, {
            redirectTo: `${process.env.CLIENT_URL}/ConfirmationPage`
        });

        if (inviteError) {
            console.warn('Invite email error (user still created):', inviteError);
        }

        // Update application status
        await authSupabase
            .from('instructor_applications')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: req.user.id
            })
            .eq('id', id);

        res.json({
            message: 'Application approved. Confirmation email sent to instructor.',
            user: profile
        });
    } catch (error) {
        console.error('Approve application error:', error);
        res.status(500).json({ error: 'Failed to approve application' });
    }
});

/**
 * POST /api/instructor/applications/:id/reject
 * Reject an instructor application
 */
router.post('/applications/:id/reject', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const authSupabase = getAuthenticatedClient(token);

        // Get the application
        const { data: application, error: fetchError } = await authSupabase
            .from('instructor_applications')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status !== 'pending') {
            return res.status(400).json({ error: `Application already ${application.status}` });
        }

        // Update application status
        const { error: updateError } = await authSupabase
            .from('instructor_applications')
            .update({
                status: 'rejected',
                rejection_reason: reason || 'No reason provided',
                reviewed_at: new Date().toISOString(),
                reviewed_by: req.user.id
            })
            .eq('id', id);

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        res.json({ message: 'Application rejected' });
    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ error: 'Failed to reject application' });
    }
});

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/instructor/users
 * Get all users with pagination
 */
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = supabaseService
            .from('users')
            .select('id, username, email, role, student_id, college, is_banned, avatar_url, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data: users, count, error } = await query;

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            users: users || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

/**
 * PATCH /api/instructor/users/:id/ban
 * Ban or unban a user
 */
router.patch('/users/:id/ban', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_banned } = req.body;

        // Can't ban yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot ban yourself' });
        }

        // Check if target is admin (only admin can ban admins)
        const { data: targetUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', id)
            .single();

        if (targetUser?.role === 'admin') {
            return res.status(403).json({ error: 'Cannot ban an admin' });
        }

        if (targetUser?.role === 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can ban instructors' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .update({ is_banned })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: is_banned ? 'User banned' : 'User unbanned',
            user
        });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ error: 'Failed to update user ban status' });
    }
});

/**
 * PATCH /api/instructor/users/:id/role
 * Change user role (admin only)
 */
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'instructor', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Can't change own role
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Role updated', user });
    } catch (error) {
        console.error('Change role error:', error);
        res.status(500).json({ error: 'Failed to change role' });
    }
});

/**
 * PATCH /api/instructor/users/:id
 * Update user details (admin only)
 */
router.patch('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, student_id, college, avatar_url } = req.body;

        const updates = {};
        if (username !== undefined) updates.username = username;
        if (email !== undefined) updates.email = email;
        if (student_id !== undefined) updates.student_id = student_id;
        if (college !== undefined) updates.college = college;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;

        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'User updated', user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * DELETE /api/instructor/users/:id
 * Delete a user (admin only)
 */
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        // Delete user (cascade will handle related data)
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ============================================
// SHOP MANAGEMENT
// ============================================

/**
 * POST /api/instructor/shop
 * Add new shop item
 */
router.post('/shop', async (req, res) => {
    try {
        const { name, type, price, image_url, description } = req.body;

        if (!name || !type || price === undefined) {
            return res.status(400).json({ error: 'Name, type, and price are required' });
        }

        const { data: item, error } = await supabase
            .from('shop_items')
            .insert({ name, type, price, image_url, description })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Item created', item });
    } catch (error) {
        console.error('Create shop item error:', error);
        res.status(500).json({ error: 'Failed to create shop item' });
    }
});

/**
 * PATCH /api/instructor/shop/:id
 * Update shop item
 */
router.patch('/shop/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, price, image_url, description } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (type !== undefined) updates.type = type;
        if (price !== undefined) updates.price = price;
        if (image_url !== undefined) updates.image_url = image_url;
        if (description !== undefined) updates.description = description;

        const { data: item, error } = await supabase
            .from('shop_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Item updated', item });
    } catch (error) {
        console.error('Update shop item error:', error);
        res.status(500).json({ error: 'Failed to update shop item' });
    }
});

/**
 * DELETE /api/instructor/shop/:id
 * Delete shop item
 */
router.delete('/shop/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('shop_items')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Item deleted' });
    } catch (error) {
        console.error('Delete shop item error:', error);
        res.status(500).json({ error: 'Failed to delete shop item' });
    }
});

// ============================================
// CERTIFICATE MANAGEMENT
// ============================================

/**
 * GET /api/instructor/certificates
 * Get all certificates with pagination
 */
router.get('/certificates', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { data: certificates, count, error } = await supabase
            .from('certificates')
            .select('*, users(username, email, avatar_url)', { count: 'exact' })
            .order('issued_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            certificates: certificates || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        console.error('Get certificates error:', error);
        res.status(500).json({ error: 'Failed to get certificates' });
    }
});

/**
 * DELETE /api/instructor/certificates/:id
 * Revoke a certificate
 */
router.delete('/certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('certificates')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Certificate revoked' });
    } catch (error) {
        console.error('Revoke certificate error:', error);
        res.status(500).json({ error: 'Failed to revoke certificate' });
    }
});

// ============================================
// BATTLES MANAGEMENT
// ============================================

// ============================================
// COURSE MANAGEMENT
// ============================================

/**
 * GET /api/instructor/courses
 * Get courses managed by the current instructor
 */
router.get('/courses', async (req, res) => {
    try {
        let query = supabase
            .from('courses')
            .select('*')
            .order('name', { ascending: true });

        // If not admin, only show own courses
        if (req.user.role !== 'admin') {
            query = query.eq('instructor_id', req.user.id);
        }

        const { data: courses, error } = await query;

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json(courses || []);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Failed to get courses' });
    }
});

/**
 * POST /api/instructor/courses
 * Create or update a course with ownership check
 */
router.post('/courses', async (req, res) => {
    try {
        const { id, name, icon_type, color, difficulty, mode } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if course exists by ID
        const { data: existingCourse } = await supabaseService
            .from('courses')
            .select('instructor_id, name')
            .eq('id', id)
            .single();

        // If exists, verify ownership
        if (existingCourse) {
            if (userRole !== 'admin' && existingCourse.instructor_id !== userId) {
                return res.status(403).json({ error: 'You do not have permission to modify this course.' });
            }
        } else {
            // If it's a NEW course (no ID match), check if the NAME is already taken globally
            const { data: nameMatch } = await supabaseService
                .from('courses')
                .select('id, name')
                .ilike('name', name)
                .single();

            if (nameMatch) {
                return res.status(400).json({ error: `The language "${name}" is already being managed by another instructor.` });
            }
        }

        const payload = {
            id,
            name,
            icon_type,
            color,
            difficulty,
            mode,
            instructor_id: existingCourse ? existingCourse.instructor_id : userId // Preserve owner or assign new
        };

        const { data: course, error } = await supabaseService
            .from('courses')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.error('Update course error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Course updated', course });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

/**
 * DELETE /api/instructor/courses/:id
 * Delete a course (Owner Only)
 */
router.delete('/courses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check ownership
        const { data: course } = await supabaseService
            .from('courses')
            .select('instructor_id')
            .eq('id', id)
            .single();

        if (course) {
            if (userRole !== 'admin' && course.instructor_id !== userId) {
                return res.status(403).json({ error: 'You do not have permission to delete this course.' });
            }
        }

        const { error } = await supabaseService
            .from('courses')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Course deleted' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

/**
 * GET /api/instructor/battles
 * Get all battles
 */
router.get('/battles', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { data: battles, count, error } = await supabase
            .from('battles')
            .select(`
                *,
                player1:player1_id(username),
                player2:player2_id(username),
                winner:winner_id(username)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            battles: battles || [],
            total: count || 0,
            page,
            limit
        });
    } catch (error) {
        console.error('Get battles error:', error);
        res.status(500).json({ error: 'Failed to get battles' });
    }
});

/**
 * GET /api/instructor/logs
 * Get system logs
 */
router.get('/logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const filter = req.query.filter || 'ALL';
        const offset = (page - 1) * limit;

        let query = supabase
            .from('system_logs')
            .select('*', { count: 'exact' });

        if (filter !== 'ALL') {
            query = query.eq('level', filter);
        }

        const { data: logs, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            logs: logs || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

/**
 * POST /api/instructor/courses/:id/levels
 * Replace all levels for a course (Bulk Update/Create)
 */
router.post('/courses/:id/levels', async (req, res) => {
    try {
        const { id } = req.params;
        const { levels, mode, difficulty } = req.body; // Array of levels + metadata

        if (!Array.isArray(levels)) {
            return res.status(400).json({ error: 'Levels must be an array' });
        }

        // Use service role client to bypass RLS (instructor already verified by middleware)
        if (!supabaseService) {
            console.error('Service role key not configured');
            return res.status(500).json({ error: 'Server configuration error: Service role key missing' });
        }

        // 1. Delete existing levels for this specific mode/difficulty
        const { error: deleteError } = await supabaseService
            .from('course_levels')
            .delete()
            .match({
                course_id: id,
                course_mode: mode || 'Beginner',
                difficulty_level: difficulty || 'Easy'
            });

        if (deleteError) {
            console.error('Delete error:', deleteError);
            throw deleteError;
        }

        // 2. Prepare new levels
        const levelsToInsert = levels.map((lvl, index) => {
            const isAdvance = (mode === 'Advance' || mode === 'Advanced');
            return {
                course_id: id,
                course_mode: mode || 'Beginner',
                difficulty_level: difficulty || 'Easy',
                level_order: index + 1, // Strictly enforce sequential 1-10
                name: lvl.name,
                description: lvl.description,
                initial_code: lvl.initialCode,
                expected_output: lvl.expectedOutput,
                solution: lvl.solution,
                hints: JSON.stringify(lvl.hints),
                rewards: JSON.stringify(lvl.rewards),
                // For Advance mode, we do NOT use blocks or sequence matching
                initial_blocks: isAdvance ? JSON.stringify([]) : JSON.stringify(lvl.initialBlocks || []),
                correct_sequence: isAdvance ? JSON.stringify([]) : JSON.stringify(lvl.correctSequence || [])
            };
        });

        // 3. Insert new levels
        // 3. Insert new levels strictly sequentially to ensure 'created_at' order
        const insertedLevels = [];
        for (const lvl of levelsToInsert) {
            const { data, error } = await supabaseService
                .from('course_levels')
                .insert(lvl)
                .select();

            if (error) {
                console.error('Insert error:', error);
                throw error;
            }
            if (data && data[0]) {
                insertedLevels.push(data[0]);
            }
        }

        // 3b. (Skipped bulk insert)

        res.json({ message: 'Levels saved successfully', levels: insertedLevels });
    } catch (error) {
        console.error('Save course levels error:', error);
        res.status(500).json({ error: 'Failed to save course levels', details: error.message });
    }
});

/**
 * PATCH /api/instructor/courses/levels/:id
 * Update a single level
 */
router.patch('/courses/levels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabaseService
            .from('course_levels')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Level updated', level: data });
    } catch (error) {
        console.error('Update level error:', error);
        res.status(500).json({ error: 'Failed to update level' });
    }
});

export default router;
