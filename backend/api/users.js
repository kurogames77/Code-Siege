import express from 'express';
import supabase from '../lib/supabase.js';
import { supabaseService } from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users/search?q=<query>
 * Search for a user by student_id (exact) or username (partial, case-insensitive)
 * Uses service-role client to bypass RLS
 */
router.get('/search', authenticateUser, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const query = q.trim();
        const db = supabaseService || supabase;

        const { data, error } = await db
            .from('users')
            .select('id, username, student_id, avatar_url, xp, level, course')
            .or(`student_id.eq.${query},username.ilike.%${query}%`)
            .neq('id', req.user.id)
            .limit(1);

        if (error) {
            console.error('User search error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No user found' });
        }

        res.json({ user: data[0] });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * POST /api/users/friend-request
 * Send a friend request (or duel invite) via the notifications table
 * Uses service-role client to bypass RLS
 */
router.post('/friend-request', authenticateUser, async (req, res) => {
    try {
        const { receiverId, senderName, mode, lobbyId } = req.body;
        const senderId = req.user.id;

        if (!receiverId) {
            return res.status(400).json({ error: 'receiverId is required' });
        }

        const db = supabaseService || supabase;

        // Check if a friend_request notification already exists between these users
        const { data: existing, error: checkError } = await db
            .from('notifications')
            .select('id, action_status')
            .eq('type', 'friend_request')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .limit(1);

        if (checkError) {
            console.error('Friend request check error:', checkError);
            return res.status(400).json({ error: checkError.message });
        }

        if (existing && existing.length > 0) {
            const req_item = existing[0];
            if (req_item.action_status === 'accepted') {
                return res.json({ status: 'already_friends' });
            } else if (req_item.action_status === 'pending') {
                return res.json({ status: 'already_sent' });
            } else {
                // Declined — allow re-send by updating
                await db
                    .from('notifications')
                    .update({
                        action_status: 'pending',
                        is_read: false,
                        created_at: new Date().toISOString(),
                        sender_id: senderId,
                        receiver_id: receiverId,
                        title: senderName || 'Someone',
                        message: 'wants to be your friend'
                    })
                    .eq('id', req_item.id);
                return res.json({ status: 'sent' });
            }
        }

        // Create new notification
        const notifType = mode === 'friend' ? 'friend_request' : 'duel_invite';
        const message = mode === 'friend'
            ? 'wants to be your friend'
            : `invited you to a duel [LOBBY:${lobbyId || 'unknown'}]`;

        const { error: insertError } = await db
            .from('notifications')
            .insert({
                type: notifType,
                sender_id: senderId,
                receiver_id: receiverId,
                title: senderName || 'Someone',
                message: message,
                action_status: 'pending',
                is_read: false
            });

        if (insertError) {
            console.error('Friend request insert error:', insertError);
            return res.status(400).json({ error: insertError.message });
        }

        res.json({ status: 'sent' });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

/**
 * GET /api/users/notifications
 * Fetch notifications for the authenticated user (with sender info)
 * Uses service-role client to bypass RLS
 */
router.get('/notifications', authenticateUser, async (req, res) => {
    try {
        const db = supabaseService || supabase;

        const { data, error } = await db
            .from('notifications')
            .select(`
                id,
                type,
                title,
                message,
                sender_id,
                action_status,
                is_read,
                created_at,
                sender:users!notifications_sender_id_fkey(
                    id, username, student_id, avatar_url, course, xp
                )
            `)
            .eq('receiver_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) {
            console.error('Fetch notifications error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ notifications: data || [] });
    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * PATCH /api/users/notifications/:id/respond
 * Accept or decline a notification (friend_request, duel_invite, etc.)
 * Also sends a response notification back to the sender
 */
router.patch('/notifications/:id/respond', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, senderName } = req.body; // action: 'accepted' or 'declined'
        const db = supabaseService || supabase;

        // Get the notification first
        const { data: notif, error: fetchError } = await db
            .from('notifications')
            .select('id, type, sender_id, receiver_id')
            .eq('id', id)
            .single();

        if (fetchError || !notif) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        // Update the notification status
        const { error: updateError } = await db
            .from('notifications')
            .update({ action_status: action, is_read: true })
            .eq('id', id);

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        // Send a response notification back to the original sender
        if (notif.sender_id) {
            const title = action === 'accepted'
                ? `${senderName || 'Someone'} accepted your friend request!`
                : `${senderName || 'Someone'} declined your friend request.`;
            const message = action === 'accepted' ? 'You are now friends.' : null;

            await db.from('notifications').insert({
                type: 'system',
                sender_id: req.user.id,
                receiver_id: notif.sender_id,
                title,
                message,
                action_status: 'viewed',
                is_read: false
            });
        }

        res.json({ status: action });
    } catch (error) {
        console.error('Respond to notification error:', error);
        res.status(500).json({ error: 'Failed to respond to notification' });
    }
});

/**
 * PATCH /api/users/notifications/:id/dismiss
 * Mark a single notification as read
 */
router.patch('/notifications/:id/dismiss', authenticateUser, async (req, res) => {
    try {
        const db = supabaseService || supabase;
        const { error } = await db
            .from('notifications')
            .update({ is_read: true })
            .eq('id', req.params.id);

        if (error) return res.status(400).json({ error: error.message });
        res.json({ status: 'dismissed' });
    } catch (error) {
        console.error('Dismiss notification error:', error);
        res.status(500).json({ error: 'Failed to dismiss notification' });
    }
});

/**
 * PATCH /api/users/notifications/clear-all
 * Mark all notifications as read for the authenticated user
 */
router.patch('/notifications/clear-all', authenticateUser, async (req, res) => {
    try {
        const db = supabaseService || supabase;
        const { error } = await db
            .from('notifications')
            .update({ is_read: true })
            .eq('receiver_id', req.user.id)
            .eq('is_read', false);

        if (error) return res.status(400).json({ error: error.message });
        res.json({ status: 'cleared' });
    } catch (error) {
        console.error('Clear all notifications error:', error);
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});

/**
 * GET /api/users/friends
 * Fetch accepted friends for the authenticated user
 * Uses service-role client to bypass RLS
 */
router.get('/friends', authenticateUser, async (req, res) => {
    try {
        const db = supabaseService || supabase;
        const userId = req.user.id;

        // Find all accepted friend_request notifications involving this user
        const { data: notifs, error } = await db
            .from('notifications')
            .select('sender_id, receiver_id')
            .eq('type', 'friend_request')
            .eq('action_status', 'accepted')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (error) {
            console.error('Fetch friends error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!notifs || notifs.length === 0) {
            return res.json({ friends: [] });
        }

        // Extract unique friend IDs
        const friendIds = notifs.map(n =>
            n.sender_id === userId ? n.receiver_id : n.sender_id
        ).filter(id => id !== userId);
        const uniqueIds = [...new Set(friendIds)];

        if (uniqueIds.length === 0) {
            return res.json({ friends: [] });
        }

        // Fetch friend profiles
        const { data: profiles, error: profileError } = await db
            .from('users')
            .select('id, username, avatar_url, xp, course')
            .in('id', uniqueIds);

        if (profileError) {
            console.error('Fetch friend profiles error:', profileError);
            return res.status(400).json({ error: profileError.message });
        }

        res.json({ friends: profiles || [] });
    } catch (error) {
        console.error('Fetch friends error:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

/**
 * POST /api/users/duel-invite
 * Send a duel invite notification
 * Uses service-role client to bypass RLS
 */
router.post('/duel-invite', authenticateUser, async (req, res) => {
    try {
        const { receiverId, senderName, lobbyId } = req.body;
        const db = supabaseService || supabase;

        const { error } = await db
            .from('notifications')
            .insert({
                type: 'duel_invite',
                sender_id: req.user.id,
                receiver_id: receiverId,
                title: senderName || 'Someone',
                message: `invited you to a duel [LOBBY:${lobbyId || 'unknown'}]`,
                action_status: 'pending',
                is_read: false
            });

        if (error) {
            console.error('Duel invite error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ status: 'sent' });
    } catch (error) {
        console.error('Duel invite error:', error);
        res.status(500).json({ error: 'Failed to send duel invite' });
    }
});

/**
 * GET /api/users/leaderboard
 * Get top users sorted by XP for leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { timeframe = 'weekly', limit = 50 } = req.query;

        // Fetch top users sorted by XP (descending)
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, avatar_url, level, xp')
            .order('xp', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Format leaderboard data
        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            id: user.id,
            name: user.username,
            avatar: user.avatar_url,
            score: user.xp || 0,
            level: user.level || 1
        }));

        res.json({ leaderboard, timeframe });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

/**
 * GET /api/users/:id
 * Get user profile by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !profile) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ profile });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * PATCH /api/users/:id
 * Update user profile (authenticated)
 */
router.patch('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, selected_hero, selected_theme, school, college, course, student_id, role, email, gender } = req.body;

        // Ensure user can only update their own profile
        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updates = {};
        if (username) updates.username = username;
        if (selected_hero) updates.selected_hero = selected_hero;
        if (selected_theme) updates.selected_theme = selected_theme;
        if (school !== undefined) updates.school = school;
        if (college !== undefined) updates.college = college;
        if (course !== undefined) updates.course = course;
        if (student_id !== undefined) updates.student_id = student_id;
        if (role !== undefined) updates.role = role;
        if (email !== undefined) updates.email = email;
        if (gender !== undefined) updates.gender = gender;

        const { data: profile, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * PATCH /api/users/:id/avatar
 * Update user avatar
 */
router.patch('/:id/avatar', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar_url } = req.body;

        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: profile, error } = await supabase
            .from('users')
            .update({ avatar_url })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Avatar updated', profile });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
});

/**
 * PATCH /api/users/:id/gems
 * Add or subtract gems
 */
router.patch('/:id/gems', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get current gems
        const { data: user } = await supabase
            .from('users')
            .select('gems')
            .eq('id', id)
            .single();

        const newGems = Math.max(0, (user?.gems || 0) + amount);

        const { data: profile, error } = await supabase
            .from('users')
            .update({ gems: newGems })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Gems updated', gems: newGems, profile });
    } catch (error) {
        console.error('Update gems error:', error);
        res.status(500).json({ error: 'Failed to update gems' });
    }
});

export default router;
