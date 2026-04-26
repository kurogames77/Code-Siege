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
            .select('id, username, student_id, avatar_url, course')
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
        
        let user = data[0];
        
        const { data: currentProgress } = await db
            .from('user_progress')
            .select('level, xp')
            .eq('user_id', user.id)
            .eq('tower_id', 'global')
            .single();
            
        user.level = currentProgress?.level || 1;
        user.xp = currentProgress?.xp || 0;

        res.json({ user });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/users/profile/:id
 * Get a user's public profile by ID
 * Uses service-role client to bypass RLS
 */
router.get('/profile/:id', authenticateUser, async (req, res) => {
    try {
        const db = supabaseService || supabase;
        const userId = req.params.id;

        const { data, error } = await db
            .from('users')
            .select('id, username, student_id, avatar_url, course')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        let user = data;
        
        // Get global stats (XP, level)
        const { data: currentProgress } = await db
            .from('user_progress')
            .select('level, xp')
            .eq('user_id', userId)
            .eq('tower_id', 'global')
            .single();
            
        user.level = currentProgress?.level || 1;
        user.xp = currentProgress?.xp || 0;
        user.exp = user.xp; // alias for frontend compatibility

        // Compute rank name from XP using the official 12-tier rank system
        const rankTiers = [
            { minExp: 0, name: 'Siege Novice' },
            { minExp: 1000, name: 'Code Initiate' },
            { minExp: 2800, name: 'Binary Apprentice' },
            { minExp: 8000, name: 'Syntax Soldier' },
            { minExp: 10000, name: 'Debug Knight' },
            { minExp: 20000, name: 'Script Master' },
            { minExp: 40000, name: 'Code Warrior' },
            { minExp: 78000, name: 'System Sentinel' },
            { minExp: 150000, name: 'Elite Compiler' },
            { minExp: 300000, name: 'Grandmaster Hacker' },
            { minExp: 500000, name: 'Apex Legend' },
            { minExp: 999000, name: 'Siege Deity' },
        ];
        let rankName = 'Siege Novice';
        for (const tier of rankTiers) {
            if (user.xp >= tier.minExp) rankName = tier.name;
        }
        user.rank_name = rankName;

        // Get battle stats (fast query for counts)
        const { data: battles } = await db
            .from('battles')
            .select('id, winner_id, status')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId},player5_id.eq.${userId}`)
            .eq('status', 'completed');

        const completedBattles = battles || [];
        const battleWins = completedBattles.filter(b => b.winner_id === userId).length;
        const battleLosses = completedBattles.length - battleWins;
        const totalBattles = completedBattles.length;
        const winRate = totalBattles > 0 ? `${Math.round((battleWins / totalBattles) * 100)}%` : '0%';

        user.battle_wins = battleWins;
        user.battle_losses = battleLosses;
        user.win_rate = winRate;

        // Get recent 5 battles for history
        const { data: recentBattles } = await db
            .from('battles')
            .select(`
                id, mode, status, created_at, winner_id,
                player1:player1_id(id, username),
                player2:player2_id(id, username),
                player3:player3_id(id, username),
                player4:player4_id(id, username),
                player5:player5_id(id, username)
            `)
            .or(`player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId},player5_id.eq.${userId}`)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(5);
            
        user.recent_battles = recentBattles || [];

        // Get achievements count
        const { count: achievementCount } = await db
            .from('user_achievements')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('unlocked', true);

        user.achievements = achievementCount || 0;

        // Get certificates count
        const { count: certCount } = await db
            .from('certificates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        user.certificates = certCount || 0;

        res.json({ user });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
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

        let query = db
            .from('notifications')
            .select(`
                id,
                type,
                title,
                message,
                sender_id,
                receiver_id,
                action_status,
                is_read,
                created_at,
                sender:users!notifications_sender_id_fkey(
                    id, username, student_id, avatar_url, course,
                    user_progress(xp, tower_id)
                )
            `)
            .eq('receiver_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        // By default, exclude invite types from the general notifications list
        // Pass ?include_invites=true to include them (used by invite polling)
        if (req.query.include_invites !== 'true') {
            query = query
                .neq('type', 'duel_invite')
                .neq('type', 'multiplayer_invite');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Fetch notifications error:', error);
            return res.status(400).json({ error: error.message });
        }

        // Auto-expire old pending invite notifications (older than 2 minutes)
        // This prevents stale invites from piling up in the database
        if (req.query.include_invites === 'true') {
            const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            db.from('notifications')
                .update({ action_status: 'expired', is_read: true })
                .eq('receiver_id', req.user.id)
                .eq('action_status', 'pending')
                .in('type', ['duel_invite', 'multiplayer_invite'])
                .lt('created_at', twoMinAgo)
                .then(() => {}) // fire-and-forget
                .catch(() => {});
        }

        const mappedData = (data || []).map(notif => {
            if (notif.sender && notif.sender.user_progress) {
                const globalProgress = notif.sender.user_progress.find(up => up.tower_id === 'global');
                notif.sender.xp = globalProgress ? globalProgress.xp : 0;
                delete notif.sender.user_progress;
            }
            return notif;
        });

        res.json({ notifications: mappedData });
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

        // If accepting a friend request, send a notification back
        if (action === 'accepted' && notif.type === 'friend_request' && notif.sender_id) {
            // Check if they are already friends (if this was somehow a duplicate "accepted" action)
            const { data: existingAccepted, error: checkError } = await db
                .from('notifications')
                .select('id')
                .eq('type', 'friend_request')
                .eq('action_status', 'accepted')
                .neq('id', id) // Check if another accepted request exists aside from the one we just updated
                .or(`and(sender_id.eq.${notif.sender_id},receiver_id.eq.${notif.receiver_id}),and(sender_id.eq.${notif.receiver_id},receiver_id.eq.${notif.sender_id})`)
                .limit(1);

            const isNewFriendship = !existingAccepted || existingAccepted.length === 0;

            if (isNewFriendship) {
                const title = `${senderName || 'Someone'} accepted your friend request!`;
                const message = 'You are now friends.';

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
        } else if (notif.sender_id && notif.type === 'friend_request') {
            // For declined friend requests, still send response notification
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

        // Fetch accepted friend_requests from the notifications table
        const { data: friendNotifs, error } = await db
            .from('notifications')
            .select('sender_id, receiver_id')
            .eq('type', 'friend_request')
            .eq('action_status', 'accepted')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (error) {
            console.error('Fetch friends error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!friendNotifs || friendNotifs.length === 0) {
            return res.json({ friends: [] });
        }

        // Extract friend IDs from the sender/receiver fields
        const friendIds = friendNotifs.map(notif =>
            notif.sender_id === userId ? notif.receiver_id : notif.sender_id
        );
        const uniqueIds = [...new Set(friendIds)];

        if (uniqueIds.length === 0) {
            return res.json({ friends: [] });
        }

        // Fetch friend profiles
        const { data: profiles, error: profileError } = await db
            .from('users')
            .select(`
                id,
                username,
                avatar_url,
                course,
                last_active_at,
                user_progress(xp, tower_id)
            `)
            .in('id', uniqueIds);

        if (profileError) {
            console.error('Fetch friend profiles error:', profileError);
            return res.status(400).json({ error: profileError.message });
        }

        const mappedProfiles = (profiles || []).map(p => {
             const globalProgress = p.user_progress?.find(up => up.tower_id === 'global');
             return {
                 ...p,
                 xp: globalProgress ? globalProgress.xp : 0,
                 user_progress: undefined
             };
        });

        res.json({ friends: mappedProfiles });
    } catch (error) {
        console.error('Fetch friends error:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

/**
 * DELETE /api/users/friends/:friendId
 * Unfriend a user by removing the accepted friend request
 * Uses service-role client to bypass RLS
 */
router.delete('/friends/:friendId', authenticateUser, async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user.id;
        const db = supabaseService || supabase;

        const { error } = await db
            .from('notifications')
            .delete()
            .eq('type', 'friend_request')
            .eq('action_status', 'accepted')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`);

        if (error) {
            console.error('Unfriend error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ status: 'unfriended' });
    } catch (error) {
        console.error('Unfriend error:', error);
        res.status(500).json({ error: 'Failed to unfriend' });
    }
});

/**
 * GET /api/users/sent-invites/status
 * Check if any duel/multiplayer invites sent by the current user have been accepted
 * Used as a fallback when WebSocket/Realtime fails to deliver the accept broadcast
 */
router.get('/sent-invites/status', authenticateUser, async (req, res) => {
    try {
        const db = supabaseService || supabase;
        const { lobbyId } = req.query;

        let query = db
            .from('notifications')
            .select(`
                id,
                type,
                receiver_id,
                action_status,
                message,
                created_at,
                receiver:users!notifications_receiver_id_fkey(
                    id, username, avatar_url,
                    user_progress(xp, tower_id)
                )
            `)
            .eq('sender_id', req.user.id)
            .in('type', ['duel_invite', 'multiplayer_invite'])
            .eq('action_status', 'accepted')
            .order('created_at', { ascending: false })
            .limit(5);

        // Filter by lobbyId if provided (match the LOBBY: tag in the message)
        if (lobbyId) {
            query = query.like('message', `%[LOBBY:${lobbyId}]%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Sent invites status error:', error);
            return res.status(400).json({ error: error.message });
        }

        // Map and enrich with XP
        const acceptedInvites = (data || []).map(notif => {
            const receiver = notif.receiver;
            let xp = 0;
            if (receiver?.user_progress) {
                const globalProgress = receiver.user_progress.find(up => up.tower_id === 'global');
                xp = globalProgress ? globalProgress.xp : 0;
            }
            return {
                notifId: notif.id,
                acceptedBy: receiver ? {
                    id: receiver.id,
                    username: receiver.username,
                    avatar_url: receiver.avatar_url,
                    xp
                } : null,
                lobbyId: notif.message?.match(/\[LOBBY:([^\]]+)\]/)?.[1] || null
            };
        }).filter(inv => inv.acceptedBy);

        res.json({ acceptedInvites });
    } catch (error) {
        console.error('Sent invites status error:', error);
        res.status(500).json({ error: 'Failed to check sent invite status' });
    }
});

/**
 * POST /api/users/duel-invite
 * Send a duel or multiplayer invite notification
 * Uses service-role client to bypass RLS
 */
router.post('/duel-invite', authenticateUser, async (req, res) => {
    try {
        const { receiverId, senderName, lobbyId, mode } = req.body;
        const db = supabaseService || supabase;

        // Determine notification type based on mode
        const isMultiplayer = mode === 'multiplayer';
        const notifType = isMultiplayer ? 'multiplayer_invite' : 'duel_invite';
        const notifMessage = isMultiplayer
            ? `invited you to a multiplayer lobby [LOBBY:${lobbyId || 'unknown'}]`
            : `invited you to a duel [LOBBY:${lobbyId || 'unknown'}]`;

        const { error } = await db
            .from('notifications')
            .insert({
                type: notifType,
                sender_id: req.user.id,
                receiver_id: receiverId,
                title: senderName || 'Someone',
                message: notifMessage,
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
 * PATCH /api/users/duel-invite/expire
 * Expire all accepted duel/multiplayer invites for a specific lobbyId
 * Called by the host when the guest leaves the lobby, so the DB polling
 * fallback does not re-detect the stale "accepted" invite and ghost-add the opponent
 */
router.patch('/duel-invite/expire', authenticateUser, async (req, res) => {
    try {
        const { lobbyId } = req.body;
        if (!lobbyId) {
            return res.status(400).json({ error: 'lobbyId is required' });
        }
        const db = supabaseService || supabase;

        const { error } = await db
            .from('notifications')
            .update({ action_status: 'expired', is_read: true })
            .eq('sender_id', req.user.id)
            .in('type', ['duel_invite', 'multiplayer_invite'])
            .eq('action_status', 'accepted')
            .like('message', `%[LOBBY:${lobbyId}]%`);

        if (error) {
            console.error('Expire duel invite error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ status: 'expired' });
    } catch (error) {
        console.error('Expire duel invite error:', error);
        res.status(500).json({ error: 'Failed to expire duel invite' });
    }
});

/**
 * GET /api/users/leaderboard
 * Get top users sorted by PvP wins (1v1 duel and multiplayer) for leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { timeframe = 'weekly', limit = 50 } = req.query;

        // Fetch battles to determine PvP ranking
        const { data: battles, error } = await supabaseService
            .from('battles')
            .select('winner_id, winner:winner_id(id, username, avatar_url)')
            .not('winner_id', 'is', null);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Tally wins (50 EXP per win)
        const usersMap = new Map();
        battles?.forEach(battle => {
            const wId = battle.winner_id;
            if (wId && battle.winner) {
                if (!usersMap.has(wId)) {
                    usersMap.set(wId, {
                        id: battle.winner.id,
                        name: battle.winner.username,
                        avatar: battle.winner.avatar_url,
                        score: 0,
                        level: 1 // Default level placeholder
                    });
                }
                usersMap.get(wId).score += 50;
            }
        });
        
        // Convert to array and sort descending by score
        const uniqueUsers = Array.from(usersMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, parseInt(limit));

        // Format leaderboard data
        const leaderboard = uniqueUsers.map((user, index) => ({
            rank: index + 1,
            ...user
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
        const { username, selected_hero, selected_theme, course, student_id, role, email, gender, student_code } = req.body;

        // Ensure user can only update their own profile
        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updates = {};
        if (username) updates.username = username;
        if (selected_theme) updates.selected_theme = selected_theme;
        if (course !== undefined) updates.course = course;
        if (student_id !== undefined) updates.student_id = student_id;
        if (role !== undefined) updates.role = role;
        if (email !== undefined) updates.email = email;
        if (gender !== undefined) updates.gender = gender;
        if (student_code !== undefined) updates.student_code = student_code;

        const db = supabaseService || supabase;
        let profile = null;

        if (Object.keys(updates).length > 0) {
            const { data, error } = await db
                .from('users')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116' || error.message?.includes('JSON object')) {
                    console.log(`[Users] PATCH update returned no rows for ${id}, trying upsert fallback...`);
                    const { data: upserted, error: upsertErr } = await db
                        .from('users')
                        .upsert({ id, email: req.user.email, ...updates }, { onConflict: 'id' })
                        .select()
                        .single();
                    if (upsertErr) {
                        return res.status(400).json({ error: upsertErr.message });
                    }
                    profile = upserted;
                } else {
                    return res.status(400).json({ error: error.message });
                }
            } else {
                profile = data;
            }
        } else {
            const { data } = await db.from('users').select('*').eq('id', id).single();
            profile = data;
        }

        if (selected_hero) {
            await db.from('user_progress').update({ selected_hero }).eq('user_id', id).eq('tower_id', 'global');
            if (profile) profile.selected_hero = selected_hero;
        }

        res.json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * PATCH /api/users/global/tower-progress
 * Modify ALL students' tower progress globally (Instructor Only)
 */
router.patch('/global/tower-progress', authenticateUser, async (req, res) => {
    try {
        const { towerId, floorsCompleted } = req.body;

        const db = supabaseService || supabase;

        // Get the executing user's role to verify permission
        const { data: executor } = await db
            .from('users')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (executor?.role !== 'instructor' && executor?.role !== 'admin') {
            return res.status(403).json({ error: 'Only Instructors can override student Tower Progress.' });
        }

        if (!towerId || floorsCompleted === undefined) {
            return res.status(400).json({ error: 'Missing required fields: towerId and floorsCompleted.' });
        }

        // Fetch ALL players (students, users, guests, instructors, etc.)
        const { data: students, error: fetchError } = await db
            .from('users')
            .select('id');

        if (fetchError) {
            return res.status(500).json({ error: 'Failed to fetch students for bulk update.' });
        }

        if (!students || students.length === 0) {
            return res.status(404).json({ error: 'No students found to update.' });
        }

        const towerKey = towerId.toString();
        const targetFloors = parseInt(floorsCompleted);

        // FIRST: Enforce Regression (Undo / Custom Lock)
        if (targetFloors === 0) {
            // UNDO MODE: Lock all instructor-opened levels, but preserve player-completed ones.
            // The instructor "open all" inserts ONE row per student with floor=N (e.g. 30).
            // Students who play get INDIVIDUAL rows for each floor (1, 2, 3, ...).
            // Strategy: detect gaps in sequential floor patterns to find instructor-injected rows.

            // Step 1: Get ALL progress rows for this tower (for all students)
            // NOTE: Only select columns guaranteed to exist (id, user_id, floor)
            const { data: allRows, error: fetchRowsError } = await db
                .from('user_progress')
                .select('id, user_id, floor')
                .eq('tower_id', towerKey)
                .gt('floor', 0);

            if (fetchRowsError) {
                console.error(`[Global Unlock] Failed to fetch rows for undo:`, fetchRowsError.message);
                return res.status(500).json({ error: 'Database error during undo.' });
            }

            if (!allRows || allRows.length === 0) {
                return res.json({ message: 'No progress rows found to reset.' });
            }

            // Step 2: Group rows by user
            const rowsByUser = {};
            allRows.forEach(row => {
                if (!rowsByUser[row.user_id]) rowsByUser[row.user_id] = [];
                rowsByUser[row.user_id].push(row);
            });

            const idsToDelete = [];

            for (const [userId, rows] of Object.entries(rowsByUser)) {
                // Sort by floor ascending
                rows.sort((a, b) => a.floor - b.floor);
                const floorSet = new Set(rows.map(r => r.floor));

                // Determine highest "earned" floor: consecutive floors starting from 1
                // e.g., if user has floors {1, 2, 3, 30}, earned = 3 (floor 30 is a jump = instructor)
                let earnedFloor = 0;
                for (let f = 1; f <= 100; f++) {
                    if (floorSet.has(f)) {
                        earnedFloor = f;
                    } else {
                        break; // Gap found — stop counting
                    }
                }

                // Delete any row with floor > earnedFloor (these are non-sequential / instructor-injected)
                rows.forEach(row => {
                    if (row.floor > earnedFloor) {
                        idsToDelete.push(row.id);
                    }
                });
            }

            // Step 3: Bulk delete instructor-injected rows
            if (idsToDelete.length > 0) {
                for (let i = 0; i < idsToDelete.length; i += 100) {
                    const chunk = idsToDelete.slice(i, i + 100);
                    const { error: deleteError } = await db
                        .from('user_progress')
                        .delete()
                        .in('id', chunk);

                    if (deleteError) {
                        console.error(`[Global Unlock] Delete chunk failed:`, deleteError.message);
                    }
                }
            }

            console.log(`[Global Unlock] Undo complete. Deleted ${idsToDelete.length} instructor-injected rows across ${Object.keys(rowsByUser).length} students.`);
            return res.json({ message: `Successfully locked tower. Removed ${idsToDelete.length} non-earned levels. Player-completed levels preserved.` });
        }

        // For non-zero targets: clean up any instructor-injected rows above the new target
        const { error: deleteError } = await db
            .from('user_progress')
            .delete()
            .eq('tower_id', towerKey)
            .gt('floor', targetFloors);

        if (deleteError) {
            console.error(`[Global Unlock] Progress regression delete failed:`, deleteError.message);
            // Non-fatal — continue with the unlock
        }

        // Fetch existing user_progress rows to prevent duplicate inserts
        // which would later crash progress.js when calling .single()
        const { data: existingProgress, error: existingError } = await db
            .from('user_progress')
            .select('user_id')
            .eq('tower_id', towerKey)
            .eq('floor', targetFloors);

        if (existingError) {
            return res.status(500).json({ error: 'Failed to check existing tower progress.' });
        }

        const usersWithProgress = new Set((existingProgress || []).map(p => p.user_id));

        const insertQueue = [];
        let successCount = 0;

        for (const student of students) {
            if (!usersWithProgress.has(student.id)) {
                insertQueue.push({
                    user_id: student.id,
                    tower_id: towerKey,
                    floor: targetFloors,
                    completed: true,
                    level: -1,
                    completed_at: new Date().toISOString()
                });
            } else {
                // Already had the floor unlocked
                successCount++;
            }
        }

        // Bulk insert new progress records
        if (insertQueue.length > 0) {
            // Chunk inserts if too large, but Supabase standard payload handles 1000s easily
            const { error: insertError } = await db
                .from('user_progress')
                .insert(insertQueue);

            if (insertError) {
                console.error(`[Global Unlock] Insert failed:`, insertError.message);
                return res.status(400).json({ error: 'Database error while globally inserting progress.' });
            }
            successCount += insertQueue.length;
        }

        res.json({ message: `Successfully unlocked ${floorsCompleted} floors for ${successCount} students globally.` });
    } catch (error) {
        console.error('Instructor global tower unlock error:', error);
        res.status(500).json({ error: 'Failed to globally update tower progress.' });
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

        const db = supabaseService || supabase;

        const { data: profile, error } = await db
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
        const { amount, method, remarks } = req.body;

        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get current gems
        const { data: progressRow } = await supabaseService
            .from('user_progress')
            .select('gems')
            .eq('user_id', id)
            .eq('tower_id', 'global')
            .single();

        const newGems = Math.max(0, (progressRow?.gems || 0) + amount);

        // Update global progress row
        await supabaseService
            .from('user_progress')
            .update({ gems: newGems })
            .eq('user_id', id)
            .eq('tower_id', 'global');

        const { data: userProfile } = await supabaseService
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
            
        if (userProfile) {
            userProfile.gems = newGems;
        }

        // Log the purchase if there is an amount added and method specified
        if (amount > 0 && method) {
            const { error: purchaseError } = await supabaseService
                .from('user_purchases')
                .insert({
                    user_id: id,
                    remarks: remarks || 'testpaid'
                });

            if (purchaseError) {
                console.warn('Failed to log purchase in user_purchases:', purchaseError.message);
            }
        }

        res.json({ message: 'Gems updated', gems: newGems, profile: userProfile });
    } catch (error) {
        console.error('Update gems error:', error);
        res.status(500).json({ error: 'Failed to update gems' });
    }
});

export default router;
