import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Users, Check, XIcon, Bell, ShoppingBag, Trophy, Swords, Clock, Trash2 } from 'lucide-react';
import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import supabase from '../../lib/supabase';
import { getRankFromExp as getRankData } from '../../utils/rankSystem';
import notificationIcon from '../../assets/Notification.png';

// Notification type configs
const TYPE_CONFIG = {
    friend_request: {
        icon: UserPlus,
        color: 'cyan',
        label: 'Friend Request',
        hasActions: true,
    },
    shop_purchase: {
        icon: ShoppingBag,
        color: 'purple',
        label: 'Shop',
        hasActions: false,
    },
    achievement: {
        icon: Trophy,
        color: 'yellow',
        label: 'Achievement',
        hasActions: false,
    },
    duel_invite: {
        icon: Swords,
        color: 'rose',
        label: 'Duel Invite',
        hasActions: true,
    },
    multiplayer_invite: {
        icon: Users,
        color: 'cyan',
        label: 'Multiplayer Invite',
        hasActions: true,
    },
    system: {
        icon: Bell,
        color: 'slate',
        label: 'System',
        hasActions: false,
    },
};

const NotificationModal = ({ isOpen, onClose, onAcceptInvite, onDeclineInvite }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { playClick, playSuccess, playCancel } = useSound();
    const { user } = useUser();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch notifications on open
    useEffect(() => {
        if (!isOpen || !user?.id) return;

        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
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
                    .eq('receiver_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(30);

                if (data) {
                    setNotifications(data);
                }
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            }
            setLoading(false);
        };

        fetchNotifications();

        // Subscribe to real-time changes (no server-side filter for RLS compatibility)
        const channel = supabase
            .channel('notifications_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications'
            }, (payload) => {
                // Client-side filter: only react to changes for this user
                const row = payload.new || payload.old;
                if (row?.receiver_id === user.id) {
                    fetchNotifications();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, user?.id]);

    const handleAccept = async (notifId) => {
        playSuccess();
        try {
            const notif = notifications.find(n => n.id === notifId);
            if (!notif) return;

            // Handle duel/multiplayer invites via parent handler if available
            if ((notif.type === 'duel_invite' || notif.type === 'multiplayer_invite') && onAcceptInvite) {
                // Parse lobbyId from message if present
                const lobbyMatch = notif.message?.match(/\[LOBBY:([^\]]+)\]/);
                const lobbyId = lobbyMatch ? lobbyMatch[1] : null;

                onAcceptInvite({
                    id: notif.id,
                    type: notif.type,
                    senderId: notif.sender_id,
                    sender: notif.sender,
                    lobbyId: lobbyId
                });
                return;
            }

            await supabase
                .from('notifications')
                .update({ action_status: 'accepted', is_read: true })
                .eq('id', notifId);
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, action_status: 'accepted', is_read: true } : n));

            // Send a notification back to the original sender (friend requests only)
            if (notif?.sender_id && notif.type === 'friend_request') {
                await supabase
                    .from('notifications')
                    .insert({
                        type: 'system',
                        sender_id: user.id,
                        receiver_id: notif.sender_id,
                        title: `${user.name || 'Someone'} accepted your friend request!`,
                        message: 'You are now friends.',
                        action_status: 'viewed',
                        is_read: false
                    });
            }
        } catch (err) {
            console.error('Failed to accept:', err);
        }
    };

    const handleDecline = async (notifId) => {
        playCancel();
        try {
            // Find the notification to get sender info
            const notif = notifications.find(n => n.id === notifId);
            if (!notif) return;

            // Handle duel/multiplayer invites via parent handler if available
            if ((notif.type === 'duel_invite' || notif.type === 'multiplayer_invite') && onDeclineInvite) {
                onDeclineInvite({
                    id: notif.id,
                    type: notif.type,
                    senderId: notif.sender_id,
                    sender: notif.sender
                });
                // Update local state since parent only handles the DB/Global side
                setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, action_status: 'declined', is_read: true } : n));
                return;
            }

            await supabase
                .from('notifications')
                .update({ action_status: 'declined', is_read: true })
                .eq('id', notifId);
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, action_status: 'declined', is_read: true } : n));

            // Send a notification back to the original sender
            if (notif?.sender_id) {
                await supabase
                    .from('notifications')
                    .insert({
                        type: 'system',
                        sender_id: user.id,
                        receiver_id: notif.sender_id,
                        title: `${user.name || 'Someone'} declined your friend request.`,
                        message: null,
                        action_status: 'viewed',
                        is_read: false
                    });
            }
        } catch (err) {
            console.error('Failed to decline:', err);
        }
    };

    const handleDismiss = async (notifId) => {
        playClick();
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notifId);
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error('Failed to dismiss:', err);
        }
    };

    const handleClearAll = async () => {
        playClick();
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Failed to clear all:', err);
        }
    };

    const getTimeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-start justify-end p-4 pt-24 pr-8"
                    onClick={onClose}
                >
                    {/* Subtle backdrop */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-[420px] max-h-[85vh] bg-gradient-to-b from-[#0d1b2a] to-[#0a1628] border border-cyan-500/20 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)] overflow-hidden z-10 font-galsb flex flex-col"
                    >
                        {/* Glow Effect */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

                        {/* Scanline overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />

                        {/* Header */}
                        <div className="relative px-6 py-5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                                    <img src={notificationIcon} alt="Notifications" className="w-10 h-10 object-contain" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-sm uppercase tracking-[0.2em]">Notifications</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
                                        title="Mark all as read"
                                    >
                                        Clear All
                                    </button>
                                )}
                                <button
                                    onClick={() => { playCancel(); onClose(); }}
                                    className="w-9 h-9 flex items-center justify-center bg-slate-800/50 hover:bg-rose-500/20 border border-white/5 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 rounded-full transition-all duration-300 hover:rotate-180"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                                    <p className="text-slate-500 text-xs mt-3 uppercase tracking-widest">Loading...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center mb-4">
                                        <Bell className="w-7 h-7 text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 text-sm font-bold">No notifications</p>
                                    <p className="text-slate-600 text-xs mt-1">Updates will appear here</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {notifications.map((notif) => {
                                        const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                                        const IconComponent = config.icon;
                                        const sender = notif.sender;
                                        const isPending = config.hasActions && notif.action_status === 'pending';
                                        const isActioned = config.hasActions && notif.action_status !== 'pending';

                                        return (
                                            <motion.div
                                                key={notif.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                onClick={() => {
                                                    // Auto-mark as read when clicking unread non-action notifications
                                                    if (!notif.is_read && !isPending) {
                                                        handleDismiss(notif.id);
                                                    }
                                                }}
                                                className={`group relative rounded-xl p-4 transition-all cursor-pointer ${notif.is_read
                                                    ? 'bg-slate-800/20 border border-white/3'
                                                    : `bg-slate-800/40 hover:bg-slate-800/60 border border-${config.color}-500/15 hover:border-${config.color}-500/30`
                                                    }`}
                                            >
                                                {/* Unread indicator */}
                                                {!notif.is_read && (
                                                    <div className={`absolute top-4 right-4 w-2 h-2 rounded-full bg-${config.color}-400 animate-pulse`} />
                                                )}

                                                {/* Time */}
                                                <div className="absolute top-3 right-4">
                                                    <span className="text-[9px] text-slate-600 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {getTimeAgo(notif.created_at)}
                                                    </span>
                                                </div>

                                                <div className="flex items-start gap-3 mb-2">
                                                    {/* Avatar + Badge column */}
                                                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                                        {/* Avatar or Icon */}
                                                        {sender?.avatar_url ? (
                                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br from-${config.color}-500/20 to-purple-500/20 border border-${config.color}-400/20 overflow-hidden`}>
                                                                <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className={`w-11 h-11 rounded-xl bg-${config.color}-500/10 border border-${config.color}-500/20 flex items-center justify-center`}>
                                                                <IconComponent className={`w-5 h-5 text-${config.color}-400`} />
                                                            </div>
                                                        )}
                                                        {/* Rank Badge below avatar */}
                                                        {sender && (notif.type === 'friend_request' || notif.type === 'duel_invite' || notif.type === 'multiplayer_invite') && (
                                                            <img
                                                                src={getRankData(sender.xp || 0).icon}
                                                                alt={getRankData(sender.xp || 0).name}
                                                                className="w-8 h-8 object-contain"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 pr-6">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={`text-[10px] text-${config.color}-400 font-bold uppercase tracking-wider`}>{config.label}</span>
                                                        </div>
                                                        <p className="text-sm text-white font-bold truncate">{notif.title}</p>
                                                        {notif.message && (
                                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                                                        )}
                                                        {/* Rank name + Course for friend requests or duel invites */}
                                                        {sender && (notif.type === 'friend_request' || notif.type === 'duel_invite' || notif.type === 'multiplayer_invite') && (() => {
                                                            const rank = getRankData(sender.xp || 0);
                                                            return (
                                                                <p className={`text-[10px] ${rank.color} font-bold uppercase mt-1`}>
                                                                    {rank.name} • {sender.course || '—'}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Action Buttons (for friend_request and duel_invite) */}
                                                {isPending && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleAccept(notif.id)}
                                                            className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 flex items-center justify-center gap-1.5"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleDecline(notif.id)}
                                                            className="flex-1 py-2 bg-slate-800/80 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                                        >
                                                            <XIcon className="w-3.5 h-3.5" />
                                                            Decline
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Actioned status */}
                                                {isActioned && (
                                                    <div className={`mt-2 py-1.5 px-3 rounded-lg text-center text-xs font-bold uppercase tracking-wider ${notif.action_status === 'accepted'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                        }`}>
                                                        {notif.action_status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                                                    </div>
                                                )}

                                                {/* Dismiss for non-action notifs */}
                                                {!config.hasActions && !notif.is_read && (
                                                    <button
                                                        onClick={() => handleDismiss(notif.id)}
                                                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-3 h-3 text-slate-500" />
                                                    </button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-6 py-3 border-t border-white/5 bg-black/30">
                                <p className="text-[10px] text-slate-600 uppercase tracking-widest text-center">
                                    {unreadCount > 0 ? `${unreadCount} unread of ${notifications.length} total` : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NotificationModal;
