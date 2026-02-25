import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, Swords, Volume2, VolumeX, Plus, User, UserPlus, Search, Check } from 'lucide-react';
import heroAsset from '../../assets/hero1.png';
import hero1aStatic from '../../assets/hero1a.png';
import hero2Static from '../../assets/hero2.png';
import hero3Static from '../../assets/hero3.png';
import hero4Static from '../../assets/hero4.png';
import lobbyMusic from '../../assets/sounds/lobbymusic.mp3';
import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import supabase from '../../lib/supabase';
import rankGold from '../../assets/rankbadges/rank6.png';
import rankSilver from '../../assets/rankbadges/rank3.png';
import rankDiamond from '../../assets/rankbadges/rank12.png';
import { getRankFromExp as getRankData } from '../../utils/rankSystem';

const DuelLobbyModal = ({ isOpen, onClose, onBack }) => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [selectedMode, setSelectedMode] = useState('Puzzle Blocks');
    const [selectedWager, setSelectedWager] = useState('100');
    const { playClick, playSuccess, playCancel, playSelect, playCountdownVoice } = useSound();
    const { user, onlineUserIds } = useUser();

    // Fetch courses from Supabase
    useEffect(() => {
        const fetchCourses = async () => {
            const { data, error } = await supabase
                .from('courses')
                .select('id, name')
                .order('name', { ascending: true });
            if (data && data.length > 0) {
                setCourses(data);
                if (!selectedLanguage) setSelectedLanguage(data[0].name);
            }
        };
        fetchCourses();
    }, []);

    // MATCH & READY STATE
    const [matchState, setMatchState] = useState('idle'); // 'idle', 'lobby', 'starting'
    const [opponent, setOpponent] = useState(null);
    const [isUserReady, setIsUserReady] = useState(false);
    const [isOpponentReady, setIsOpponentReady] = useState(false);
    const [timer, setTimer] = useState(0); // Lobby countdown
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [invitedFriendId, setInvitedFriendId] = useState(null);
    const [successInviteIds, setSuccessInviteIds] = useState(new Set());

    // MODALS
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [modalMode, setModalMode] = useState('opponent'); // 'friend' | 'opponent'

    // Get selected hero
    const selectedHeroImage = localStorage.getItem('selectedHeroImage') || 'hero1a.png';
    const heroMap = {
        'hero1a.png': hero1aStatic,
        'hero2.png': hero2Static,
        'hero3.png': hero3Static,
        'hero4.png': hero4Static
    };
    const currentHeroImage = heroMap[selectedHeroImage] || hero1aStatic;
    const [startCountdown, setStartCountdown] = useState(5); // Launch countdown

    // AUDIO
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('lobbyMusic_muted');
        return saved === 'true';
    });
    const audioRef = React.useRef(null);

    const [friends, setFriends] = useState([]);

    // --- FETCH FRIENDS ---
    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchFriends = async () => {
            console.log('[DuelLobby] Fetching friends for user:', user.id);
            // Get accepted friend requests where current user is sender or receiver
            const { data: notifs, error } = await supabase
                .from('notifications')
                .select('sender_id, receiver_id')
                .eq('type', 'friend_request')
                .eq('action_status', 'accepted')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (error) {
                console.error('[DuelLobby] Error fetching friend notifications:', error.message);
                return;
            }

            if (!notifs || notifs.length === 0) {
                console.log('[DuelLobby] No friend notifications found.');
                setFriends([]);
                return;
            }

            console.log('[DuelLobby] Found raw friend notifications:', notifs.length);

            // Collect friend user IDs
            const friendIds = notifs.map(n =>
                n.sender_id === user.id ? n.receiver_id : n.sender_id
            ).filter(id => id !== user.id);

            // Deduplicate
            const uniqueIds = [...new Set(friendIds)];
            if (uniqueIds.length === 0) {
                console.log('[DuelLobby] No unique friend IDs after filtering.');
                setFriends([]);
                return;
            }

            console.log('[DuelLobby] Fetching profiles for unique friend IDs:', uniqueIds);

            // Fetch friend profiles
            const { data: profiles, error: profileError } = await supabase
                .from('users')
                .select('id, username, avatar_url, xp')
                .in('id', uniqueIds);

            if (profileError) {
                console.error('[DuelLobby] Error fetching friend profiles:', profileError.message);
                return;
            }

            if (profiles) {
                console.log('[DuelLobby] Successfully fetched profiles:', profiles.length);
                const friendsList = profiles.map(p => {
                    const rank = getRankData(p.xp || 0);
                    return {
                        id: p.id,
                        name: p.username || 'Unknown',
                        avatar: p.avatar_url,
                        rankName: rank.name,
                        rankIcon: rank.icon,
                        course: 'N/A',
                        status: onlineUserIds.has(String(p.id)) ? 'online' : 'offline'
                    };
                });
                setFriends(friendsList);
            }
        };

        fetchFriends();
    }, [isOpen, user, onlineUserIds]);

    // Update friends' status when onlineUserIds changes
    useEffect(() => {
        if (friends.length > 0) {
            setFriends(prev => prev.map(f => ({
                ...f,
                status: onlineUserIds.has(String(f.id)) ? 'online' : 'offline'
            })));
        }
    }, [onlineUserIds]);

    // --- REALTIME PRESENCE & BROADCAST ---
    const lobbyChannelRef = React.useRef(null);

    useEffect(() => {
        if (!isOpen || !user) return;

        const channel = supabase.channel('duel-lobby', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        lobbyChannelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.values(state)
                    .flat()
                    .filter(u => u.id !== user.id)
                    .map(u => ({
                        ...u,
                        status: 'online'
                    }));
                setOnlineUsers(users);
            })
            .on('broadcast', { event: 'duel-invite' }, ({ payload }) => {
                if (payload.targetId === user.id) {
                    console.log('Received duel invite from:', payload.senderName);
                    // No longer auto-accepting. NotificationModal handles the UI.
                }
            })
            .on('broadcast', { event: 'duel-accept' }, ({ payload }) => {
                // If we are the sender and the recipient accepted
                if (payload.targetId === user.id && matchState === 'idle') {
                    playSuccess();
                    setOpponent({
                        id: payload.senderId,
                        name: payload.senderName,
                        avatar: payload.senderAvatar,
                        rankName: payload.senderRankName,
                        rankIcon: payload.senderRankIcon
                    });
                    setMatchState('lobby');
                    setTimer(60);
                }
            })
            .on('broadcast', { event: 'player-ready' }, ({ payload }) => {
                if (opponent && payload.playerId === opponent.id) {
                    setIsOpponentReady(payload.isReady);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar,
                        rankName: user.rankName,
                        rankIcon: user.rankIcon,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, user, opponent, matchState]);

    // --- TIMERS ---

    // Lobby Timer (60s -> 0)
    useEffect(() => {
        let interval;
        if (matchState === 'lobby' && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [matchState, timer]);

    // Launch Countdown (5s -> 0)
    useEffect(() => {
        let interval;
        if (matchState === 'starting' && startCountdown > 0) {
            playCountdownVoice(startCountdown.toString());
            interval = setInterval(() => {
                setStartCountdown((prev) => prev - 1);
            }, 1000);
        } else if (matchState === 'starting' && startCountdown === 0) {
            navigate(`/arena-battle/b-${Math.floor(Math.random() * 9000) + 1000}`, {
                state: {
                    opponent: opponent.name,
                    language: selectedLanguage,
                    mode: selectedMode,
                    wager: selectedWager
                }
            });
        }
        return () => clearInterval(interval);
    }, [matchState, startCountdown, navigate, opponent, selectedLanguage, selectedWager]);

    // --- LOGIC ---

    const handleInvite = async (friend) => {
        if (invitedFriendId === friend.id) return;
        playClick();
        setInvitedFriendId(friend.id);

        try {
            // 1. Send persistent notification
            await supabase
                .from('notifications')
                .insert({
                    type: 'duel_invite',
                    sender_id: user.id,
                    receiver_id: friend.id,
                    title: user.name || user.username || 'Someone',
                    message: 'invited you to a duel',
                    action_status: 'pending',
                    is_read: false
                });

            // 2. Broadcast the invite for real-time
            if (lobbyChannelRef.current) {
                lobbyChannelRef.current.send({
                    type: 'broadcast',
                    event: 'duel-invite',
                    payload: {
                        targetId: friend.id,
                        senderId: user.id,
                        senderName: user.name,
                        senderAvatar: user.avatar,
                        senderRankName: user.rankName,
                        senderRankIcon: user.rankIcon
                    }
                });
            }

            setSuccessInviteIds(prev => new Set([...prev, friend.id]));
            setInvitedFriendId(null);
            playSuccess();
        } catch (err) {
            console.error('Failed to send multi invite:', err);
            setInvitedFriendId(null);
        }
    };

    const handleReadyClick = () => {
        if (!opponent) return;
        playSuccess();
        setIsUserReady(true);

        // Broadcast ready state
        if (lobbyChannelRef.current) {
            lobbyChannelRef.current.send({
                type: 'broadcast',
                event: 'player-ready',
                payload: {
                    playerId: user.id,
                    isReady: true
                }
            });
        }
    };

    // Simulate Opponent Readying Up
    useEffect(() => {
        if (matchState === 'lobby' && opponent && !isOpponentReady) {
            const randomDelay = Math.random() * 3000 + 2000; // 2-5s delay
            const timeout = setTimeout(() => {
                setIsOpponentReady(true);
            }, randomDelay);
            return () => clearTimeout(timeout);
        }
    }, [matchState, opponent, isOpponentReady]);

    // Auto-Start when BOTH are ready
    useEffect(() => {
        if (matchState === 'lobby' && isUserReady && isOpponentReady) {
            setMatchState('starting');
            setStartCountdown(5);
        }
    }, [matchState, isUserReady, isOpponentReady]);

    // --- AUDIO CONTROL ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isOpen && !isMuted && matchState !== 'starting') {
            audio.play().catch(err => console.log('Duel lobby music play failed:', err));
        } else {
            audio.pause();
        }
    }, [isOpen, isMuted, matchState]);

    useEffect(() => {
        localStorage.setItem('lobbyMusic_muted', isMuted);
    }, [isMuted]);

    // --- RENDER ---

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl font-galsb overflow-hidden">

                    {/* Background Elements */}
                    <div className="absolute inset-0 z-0">
                        {/* Split Background */}
                        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-cyan-900/10 to-transparent border-r border-white/5" />
                        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-rose-900/10 to-transparent" />
                        <BackgroundEffect color="mixed" />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="w-full h-full max-w-[1600px] max-h-[900px] relative z-10 flex flex-col pointer-events-auto"
                    >
                        {/* HEADER */}
                        <div className="h-20 flex items-center justify-between px-8 border-b border-white/10 bg-black/40 backdrop-blur-md relative">
                            {/* Left: Back Button */}
                            <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-600 hover:border-red-500 hover:bg-red-500/20 transition-all duration-300 group z-20 relative">
                                <X className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-transform duration-300 group-hover:rotate-90" />
                            </button>

                            {/* Center: Title info & Timer */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                {matchState === 'lobby' || matchState === 'starting' ? (
                                    <div className="flex flex-col items-center animate-in fade-in duration-300">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                            {matchState === 'starting' ? 'Game Starting' : 'Auto-Start In'}
                                        </span>
                                        <span className={`text-2xl font-black tracking-wider ${matchState === 'starting' ? (startCountdown < 10 ? 'text-rose-500' : 'text-slate-200') : (timer < 10 ? 'text-rose-500' : 'text-slate-200')}`}>
                                            {formatTime(matchState === 'starting' ? startCountdown : timer)}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Private Duel</h1>
                                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                                            <span>ID: 8472-9921</span>
                                            <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                            <span className="text-emerald-500">Connected</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center gap-6 relative z-20">
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`p-2 rounded-lg transition-colors ${isMuted ? 'text-rose-500 hover:bg-rose-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>

                        {/* MAIN CONTENT GRID */}
                        <div className="flex-1 flex overflow-hidden">

                            {/* LEFT SIDEBAR: SETTINGS */}
                            <div className="w-80 bg-black/60 border-r border-white/5 flex flex-col p-6 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Match Settings</h3>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Language</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <select
                                                value={selectedLanguage}
                                                onChange={(e) => { playSelect(); setSelectedLanguage(e.target.value); }}
                                                className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-xl appearance-none relative z-10 focus:border-cyan-500 focus:outline-none transition-colors"
                                            >
                                                {courses.map((c) => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-20 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-violet-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <select
                                                value={selectedMode}
                                                onChange={(e) => { playSelect(); setSelectedMode(e.target.value); }}
                                                className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-xl appearance-none relative z-10 focus:border-violet-500 focus:outline-none transition-colors"
                                            >
                                                <option>Puzzle Blocks</option>
                                                <option>Blocks</option>
                                                <option>Hardcode</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-20 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wager (EXP)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <select
                                                value={selectedWager}
                                                onChange={(e) => { playSelect(); setSelectedWager(e.target.value); }}
                                                className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-xl appearance-none relative z-10 focus:border-amber-500 focus:outline-none transition-colors"
                                            >
                                                <option value="50">50 EXP</option>
                                                <option value="100">100 EXP</option>
                                                <option value="250">250 EXP</option>
                                                <option value="500">500 EXP</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-20 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Time Limit</p>
                                        <p className="text-xl font-black text-white">10:00</p>
                                    </div>
                                </div>
                            </div>

                            {/* CENTER STAGE: VS DISPLAY */}
                            <div className="flex-1 relative flex items-center justify-center p-10">

                                <div className="flex items-center justify-between w-full max-w-4xl gap-8 relative z-10">

                                    {/* LEFT PLAYER (YOU) */}
                                    <motion.div
                                        initial={{ x: -100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        className="flex-1 aspect-[3/4] max-w-[350px] relative group"
                                    >
                                        <div className={`absolute inset-0 rounded-[2rem] border overflow-hidden transform transition-all duration-500 ${isUserReady || matchState === 'idle' // Always full color if idle (before invite) or ready
                                            ? 'bg-gradient-to-br from-cyan-900/40 to-black/80 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.2)]'
                                            : 'bg-slate-900 border-slate-700 grayscale opacity-40'
                                            }`}>
                                            {/* Glows only if Ready */}
                                            {(isUserReady || matchState === 'idle') && <div className="absolute top-0 left-0 w-full h-1/2 bg-cyan-500/20 blur-[100px]" />}

                                            <div className="absolute inset-0 flex flex-col">
                                                {/* User Info - Top */}


                                                {/* Hero Image - Full Body */}
                                                <div className="absolute inset-x-0 bottom-0 h-[70%] z-10 pointer-events-none flex items-end justify-center overflow-hidden">
                                                    <motion.img
                                                        initial={{ scale: 1.0, y: 50 }}
                                                        animate={{
                                                            scale: (isUserReady || matchState === 'idle') ? 1.0 : 0.9,
                                                            y: (isUserReady || matchState === 'idle') ? 10 : 40
                                                        }}
                                                        src={currentHeroImage}
                                                        className={`w-full h-full object-contain transition-all duration-700 ${isUserReady || matchState === 'idle' ? 'drop-shadow-[0_20px_50px_rgba(34,211,238,0.5)] brightness-110' : 'brightness-50 grayscale'}`}
                                                        alt="Hero"
                                                    />

                                                    {/* Vignette to blend edges */}
                                                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                                                </div>

                                                {/* User Info - Top */}
                                                <div className="relative z-20 flex flex-col items-center pt-4 pointer-events-none">
                                                    <div className={`w-24 h-24 rounded-xl border-2 bg-slate-900/80 backdrop-blur-md relative mb-3 transition-all duration-500 ${isUserReady || matchState === 'idle' ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] scale-110' : 'border-slate-500'}`}>
                                                        <img src={user.avatar} className="w-full h-full object-cover rounded-lg" alt="Avatar" />
                                                        <div className="absolute -bottom-2.5 -right-2.5 p-0.5">
                                                            <img src={user.rankIcon} className="w-12 h-12 rounded-full object-contain" alt="Rank" />
                                                        </div>
                                                    </div>
                                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">{user.name}</h2>
                                                    <div className={`text-xs font-black uppercase tracking-[0.3em] mt-1.5 drop-shadow-lg flex items-center gap-1.5 ${isUserReady || matchState === 'idle' ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                        {user.rankName}
                                                    </div>
                                                </div>
                                            </div>


                                            {/* Not Ready Overlay Text */}
                                            {matchState !== 'idle' && !isUserReady && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
                                                    <div className="px-4 py-2 bg-black/60 rounded-lg border border-white/10 text-slate-400 font-bold tracking-widest uppercase text-xs backdrop-blur-sm animate-pulse">
                                                        Not Ready
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* VS BADGE */}
                                    <div className="relative z-20 flex flex-col items-center justify-center shrink-0">
                                        <div className="absolute inset-0 bg-white/20 blur-[60px] rounded-full animate-pulse" />
                                        <Swords className="w-16 h-16 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] relative z-10" />
                                        <h1 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tighter mt-[-10px] relative z-10 drop-shadow-lg">VS</h1>
                                    </div>

                                    {/* RIGHT PLAYER (OPPONENT) */}
                                    <motion.div
                                        initial={{ x: 100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        className="flex-1 aspect-[3/4] max-w-[350px] relative group"
                                    >
                                        <div className={`absolute inset-0 rounded-[2rem] border overflow-hidden transform transition-all duration-500 flex flex-col items-center justify-center ${opponent
                                            ? (isOpponentReady
                                                ? 'bg-gradient-to-bl from-rose-900/40 to-black/80 border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.2)]'
                                                : 'bg-slate-900/80 border-slate-700 grayscale opacity-40')
                                            : 'bg-white/[0.02] border-white/10 border-dashed'
                                            }`}>
                                            {opponent ? (
                                                <>
                                                    {isOpponentReady && <div className="absolute top-0 right-0 w-full h-1/2 bg-rose-500/20 blur-[100px]" />}

                                                    <div className="absolute inset-0 flex flex-col">
                                                        {/* Hero - Full Body */}
                                                        <div className="absolute inset-x-0 bottom-0 h-[70%] z-10 pointer-events-none flex items-end justify-center overflow-hidden">
                                                            <motion.img
                                                                initial={{ scale: 1.0, y: 50 }}
                                                                animate={{
                                                                    scale: isOpponentReady ? 1.0 : 0.9,
                                                                    y: isOpponentReady ? 10 : 40
                                                                }}
                                                                src={opponent.heroImage || hero2Static}
                                                                className={`w-full h-full object-contain transition-all duration-700 ${isOpponentReady ? 'drop-shadow-[0_20px_50px_rgba(244,63,94,0.5)] brightness-110' : 'brightness-50 grayscale'}`}
                                                                alt="Hero"
                                                            />
                                                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                                                        </div>

                                                        {/* Info - Top */}
                                                        <div className="relative z-20 flex flex-col items-center pt-4 pointer-events-none w-full">
                                                            <div className={`w-24 h-24 rounded-xl border-2 bg-slate-900/80 backdrop-blur-md relative mb-3 transition-all duration-500 ${isOpponentReady ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-110' : 'border-slate-500'}`}>
                                                                <img src={opponent.avatar} className="w-full h-full object-cover rounded-lg" alt="Avatar" />
                                                                <div className="absolute -bottom-3 -right-3">
                                                                    <img src={opponent.rankIcon} className="w-16 h-16 object-contain drop-shadow-xl" alt="Rank" />
                                                                </div>
                                                            </div>
                                                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,1)] scale-110">{opponent.name}</h2>
                                                            <div className={`text-[10px] font-black uppercase tracking-[0.4em] mt-1 drop-shadow-lg ${isOpponentReady ? 'text-rose-400' : 'text-slate-500'}`}>
                                                                {opponent.rankName}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`absolute bottom-0 inset-x-0 h-2 shadow-[0_0_20px_rgba(244,63,94,0.8)] ${isOpponentReady ? 'bg-rose-500' : 'bg-slate-700'}`} />

                                                    {/* Not Ready Overlay Text */}
                                                    {!isOpponentReady && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 font-galsb tracking-widest text-white/50">
                                                            <div className="px-4 py-2 bg-black/60 rounded-lg border border-white/10 text-slate-400 font-bold tracking-widest uppercase text-xs backdrop-blur-sm animate-pulse">
                                                                Not Ready
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div
                                                    onClick={() => { playClick(); setModalMode('opponent'); setShowAddFriendModal(true); }}
                                                    className="flex flex-col items-center gap-4 opacity-30 hover:opacity-100 transition-opacity cursor-pointer group/invite"
                                                >
                                                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white flex items-center justify-center group-hover/invite:border-cyan-400 group-hover/invite:bg-cyan-500/10 transition-all">
                                                        <Plus className="w-8 h-8 text-white group-hover/invite:text-cyan-400" />
                                                    </div>
                                                    <p className="text-sm font-bold text-white group-hover/invite:text-cyan-400 uppercase tracking-widest transition-colors">Invite Opponent</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* RIGHT SIDEBAR: INVITE & FRIENDS */}
                            <div className="w-80 bg-black/60 border-l border-white/5 flex flex-col p-6 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                                <div className="mb-6">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3 mb-2">
                                        <span>Invite Friends</span>
                                        <button
                                            onClick={() => { playClick(); setModalMode('friend'); setShowAddFriendModal(true); }}
                                            className="p-2 bg-white/5 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/50 rounded-lg transition-all group/add"
                                        >
                                            <UserPlus className="w-4 h-4 text-slate-400 group-hover/add:text-cyan-400" />
                                        </button>
                                    </h3>
                                    <span className="text-[10px] px-2 py-1 bg-white/10 rounded text-slate-500 font-bold">{friends.filter(f => f.status === 'online').length} Online</span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2 custom-scrollbar">
                                    {friends.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <User className="w-10 h-10 text-slate-700 mb-3" />
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No friends yet</p>
                                            <p className="text-slate-600 text-[10px] mt-1">Add friends to invite them to duels</p>
                                        </div>
                                    ) : (
                                        friends.map((friend) => (
                                            <button
                                                key={friend.id}
                                                onClick={() => handleInvite(friend)}
                                                disabled={!!opponent || friend.status !== 'online'}
                                                className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 group text-left ${friend.status === 'online'
                                                    ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                                    : 'bg-white/[0.02] border-white/[0.03] opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden border border-white/10">
                                                        {friend.avatar ? (
                                                            <img src={friend.avatar} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                                <User className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a120b] ${friend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{friend.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <img src={friend.rankIcon} className="w-8 h-8 object-contain drop-shadow-sm" alt="Rank" />
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest truncate">{friend.rankName}</p>
                                                    </div>
                                                </div>
                                                {friend.status === 'online' && (
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg ${successInviteIds.has(friend.id)
                                                        ? 'bg-blue-600/50 cursor-default'
                                                        : invitedFriendId === friend.id
                                                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                                            : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-900/20 hover:scale-110 active:scale-95'
                                                        }`}>
                                                        {successInviteIds.has(friend.id) ? (
                                                            <Check className="w-5 h-5 text-blue-200" />
                                                        ) : invitedFriendId === friend.id ? (
                                                            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                                        ) : (
                                                            <Plus className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM BAR */}
                        <div className="h-24 bg-black/80 border-t border-white/10 flex items-center justify-between px-8 backdrop-blur-xl relative z-20">
                            <div className="flex items-center gap-4 relative">
                                {/* Potential controls here */}
                            </div>

                            {/* READY / START BUTTON */}
                            <button
                                onClick={handleReadyClick}
                                disabled={isUserReady || !opponent || matchState === 'starting'}
                                className={`h-14 px-16 rounded-full border-2 flex items-center justify-center gap-2 transition-all ${isUserReady
                                    ? 'bg-emerald-600 border-emerald-400 text-white cursor-default'
                                    : opponent
                                        ? 'bg-gradient-to-b from-amber-400 to-orange-500 border-amber-300 text-amber-950 font-black hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.6)] cursor-pointer'
                                        : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                <Swords className={`w-6 h-6 ${isUserReady || matchState === 'starting' ? '' : 'animate-pulse'}`} />
                                <span className="font-black uppercase tracking-widest text-lg">
                                    {matchState === 'starting' ? 'STARTING...' : isUserReady ? 'READY!' : opponent ? 'CLICK TO READY' : 'WAITING FOR PLAYER'}
                                </span>
                            </button>
                        </div>
                    </motion.div >

                    {/* GAME START COUNTDOWN MODAL */}
                    < AnimatePresence >
                        {matchState === 'starting' && (
                            <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md">
                                <motion.div
                                    key="countdown"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.5 }}
                                    className="flex flex-col items-center"
                                >
                                    <p className="text-emerald-400 font-bold tracking-[0.2em] uppercase mb-4 text-xl">Game Starting In</p>
                                    <motion.div
                                        key="countdown-display"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                    >
                                        {startCountdown}
                                    </motion.div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence >

                    {/* Lobby Music */}
                    < audio
                        ref={audioRef}
                        src={lobbyMusic}
                        loop
                        volume={0.8}
                        preload="auto"
                    />
                    {
                        showAddFriendModal && (
                            <AddFriendModal isOpen={showAddFriendModal} onClose={() => setShowAddFriendModal(false)} mode={modalMode} />
                        )
                    }
                </div >
            )}
        </AnimatePresence >
    );
};

const AddFriendModal = ({ isOpen, onClose, mode }) => {
    const { playClick, playSuccess } = useSound();
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;

        setSearching(true);
        setSearchError('');
        setFoundUser(null);

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, student_id, avatar_url, course, xp')
                .eq('student_id', query)
                .single();

            if (error || !data) {
                setSearchError('No player found with that ID');
                return;
            }

            if (data.id === user?.id) {
                setSearchError("That's your own ID!");
                return;
            }

            playSuccess();
            setFoundUser(data);
        } catch (err) {
            setSearchError('Search failed. Try again.');
        } finally {
            setSearching(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const [addStatus, setAddStatus] = useState(''); // '', 'sending', 'sent', 'error', 'already_sent'

    const handleAdd = async () => {
        if (!foundUser || !user?.id) return;
        setAddStatus('sending');

        try {
            // Check if a friend_request notification already exists between these users
            const { data: existing } = await supabase
                .from('notifications')
                .select('id, action_status')
                .eq('type', 'friend_request')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${foundUser.id}),and(sender_id.eq.${foundUser.id},receiver_id.eq.${user.id})`)
                .limit(1);

            if (existing && existing.length > 0) {
                const req = existing[0];
                if (req.action_status === 'accepted') {
                    setAddStatus('already_friends');
                } else if (req.action_status === 'pending') {
                    setAddStatus('already_sent');
                } else {
                    // Declined — allow re-send by updating
                    await supabase
                        .from('notifications')
                        .update({
                            action_status: 'pending',
                            is_read: false,
                            created_at: new Date().toISOString(),
                            sender_id: user.id,
                            receiver_id: foundUser.id,
                            title: user.name || user.username || 'Someone',
                            message: `wants to be your friend`
                        })
                        .eq('id', req.id);
                    playSuccess();
                    setAddStatus('sent');
                }
                return;
            }

            // Create new notification
            const { error } = await supabase
                .from('notifications')
                .insert({
                    type: mode === 'friend' ? 'friend_request' : 'duel_invite',
                    sender_id: user.id,
                    receiver_id: foundUser.id,
                    title: user.name || user.username || 'Someone',
                    message: mode === 'friend' ? 'wants to be your friend' : 'invited you to a duel',
                    action_status: 'pending',
                    is_read: false
                });

            if (error) throw error;

            playSuccess();
            setAddStatus('sent');
        } catch (err) {
            console.error('Failed to send friend request:', err);
            setAddStatus('error');
        }
    };

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setFoundUser(null);
            setSearchError('');
            setAddStatus('');
        }
    }, [isOpen]);

    // Determine rank from XP
    const getRankName = (xp) => {
        if (xp >= 5000) return 'Diamond';
        if (xp >= 3000) return 'Platinum';
        if (xp >= 1500) return 'Gold';
        if (xp >= 500) return 'Silver';
        if (xp >= 100) return 'Bronze';
        return 'Novice';
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                            <UserPlus className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg italic tracking-wider">{mode === 'friend' ? 'ADD FRIEND' : 'ADD OPPONENT'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Search by Student ID</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { playClick(); onClose(); }}
                        className="p-2 hover:bg-red-500/20 rounded-full transition-all duration-300 text-slate-400 hover:text-red-400 group"
                    >
                        <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Search Input */}
                    <div className="relative group flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors z-20" />
                            <input
                                type="text"
                                placeholder="Enter Student ID (e.g. 22-A-01003)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm pl-11 pr-4 py-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all placeholder:text-slate-600 relative z-10"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searching || !searchQuery.trim()}
                            className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all relative z-10 shrink-0"
                        >
                            {searching ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Search'
                            )}
                        </button>
                    </div>

                    {/* Search Error */}
                    {searchError && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                        >
                            <User className="w-4 h-4 text-red-400 shrink-0" />
                            <p className="text-red-400 text-xs font-bold">{searchError}</p>
                        </motion.div>
                    )}

                    {/* Found User Profile Card */}
                    {foundUser && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-cyan-950/40 to-slate-900/60 border border-cyan-500/20 rounded-2xl p-5 relative overflow-hidden"
                        >
                            {/* Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] pointer-events-none" />

                            <div className="flex items-center gap-4 relative z-10">
                                {/* Avatar */}
                                <div className="w-16 h-16 rounded-xl border-2 border-cyan-500/40 bg-slate-800 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.2)] shrink-0">
                                    <img
                                        src={foundUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${foundUser.username}`}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-black text-lg uppercase tracking-wider truncate">{foundUser.username}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{getRankName(foundUser.xp || 0)}</span>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{foundUser.course || 'N/A'}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {foundUser.student_id}</p>
                                </div>
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={handleAdd}
                                disabled={addStatus === 'sending' || addStatus === 'sent' || addStatus === 'already_friends' || addStatus === 'already_sent'}
                                className={`w-full mt-4 py-3 font-black text-sm uppercase tracking-[0.2em] rounded-xl transition-all relative z-10 flex items-center justify-center gap-2 ${addStatus === 'sent' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                                    addStatus === 'already_sent' || addStatus === 'already_friends' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                        addStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                            'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]'
                                    }`}
                            >
                                {addStatus === 'sending' ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : addStatus === 'sent' ? (
                                    <><Check className="w-4 h-4" /> Request Sent!</>
                                ) : addStatus === 'already_sent' ? (
                                    'Request Already Pending'
                                ) : addStatus === 'already_friends' ? (
                                    'Already Friends'
                                ) : addStatus === 'error' ? (
                                    'Failed — Try Again'
                                ) : (
                                    <><Plus className="w-4 h-4" /> {mode === 'friend' ? 'Add Friend' : 'Invite to Duel'}</>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* Empty State */}
                    {!foundUser && !searchError && !searching && (
                        <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                            <Search className="w-8 h-8 text-slate-600 mb-3" />
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Enter a Student ID to find a player</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/40 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Or share your ID: <span className="text-cyan-400 select-all font-mono">{user?.studentId || '—'}</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

// Background Effect adapted for Split Screen
const BackgroundEffect = ({ color }) => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Left side particles (Cyan) */}
            {[...Array(10)].map((_, i) => (
                <motion.div
                    key={`l-${i}`}
                    className="absolute bg-cyan-500/20 w-[1px] h-[100px]"
                    initial={{ opacity: 0, top: -100, left: `${Math.random() * 50}%` }}
                    animate={{ opacity: [0, 0.5, 0], top: ['0%', '100%'] }}
                    transition={{ duration: Math.random() * 5 + 3, repeat: Infinity, delay: Math.random() * 5, ease: "linear" }}
                />
            ))}
            {/* Right side particles (Red) */}
            {[...Array(10)].map((_, i) => (
                <motion.div
                    key={`r-${i}`}
                    className="absolute bg-rose-500/20 w-[1px] h-[100px]"
                    initial={{ opacity: 0, top: -100, left: `${50 + Math.random() * 50}%` }}
                    animate={{ opacity: [0, 0.5, 0], top: ['0%', '100%'] }}
                    transition={{ duration: Math.random() * 5 + 3, repeat: Infinity, delay: Math.random() * 5, ease: "linear" }}
                />
            ))}
        </div>
    )
}

export default DuelLobbyModal;
