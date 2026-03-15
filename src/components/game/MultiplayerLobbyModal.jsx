import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, Users, Zap, Shield, Swords, UserPlus, Globe, Award, Medal, Volume2, VolumeX, User, Check } from 'lucide-react';
import heroAsset from '../../assets/hero1.png';
import hero1aStatic from '../../assets/hero1a.png';
import hero2Static from '../../assets/hero2.png';
import hero3Static from '../../assets/hero3.png';
import hero4Static from '../../assets/hero4.png';
import ccsLogo from '../../assets/ccslogo.png';
import jrmsuLogo from '../../assets/jrmsulogo.png';
import gameMapBg from '../../assets/gamemapbg.png';
import lobbyMusic from '../../assets/sounds/lobbymusic.mp3';
import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';

import { getRankFromExp as getRankData } from '../../utils/rankSystem';
import supabase from '../../lib/supabase';
import { userAPI, algorithmAPI } from '../../services/api';

const MultiplayerLobbyModal = ({ isOpen, onClose, onBack, initialInviter }) => {
    const navigate = useNavigate();

    // Core User Data
    const { user, onlineUserIds } = useUser();

    // Get selected hero
    const selectedHeroImage = localStorage.getItem('selectedHeroImage') || 'hero1a.png';
    const heroMap = {
        'hero1a.png': hero1aStatic,
        'hero2.png': hero2Static,
        'hero3.png': hero3Static,
        'hero4.png': hero4Static
    };
    const currentHeroImage = heroMap[selectedHeroImage] || hero1aStatic;

    const currentUser = {
        id: user.id,
        name: user.name,
        level: user.level || 42,
        status: 'ready',
        avatar: user.avatar || heroAsset,
        heroImage: currentHeroImage, // Use the real static image
        rankName: user.rankName,
        rankIcon: user.rankIcon,
        rankId: null,
        achievements: 35,
        ms: '51ms',
        logo: ccsLogo,
        isReady: false
    };

    const [players, setPlayers] = useState([{ ...currentUser, isReady: true }]); // User is effectively "ready" to search initially, but will need to confirm match

    // Matchmaking State
    const [matchState, setMatchState] = useState('idle'); // idle, searching, ready_check, starting
    const [timer, setTimer] = useState(0); // Unified timer state

    // Language, Mode & Wager Selection
    const [selectedLanguage, setSelectedLanguage] = useState('JavaScript');
    const [selectedMode, setSelectedMode] = useState('Puzzle Blocks');
    const [selectedWager, setSelectedWager] = useState(100);

    const languages = ['Python', 'C#', 'C++', 'JavaScript', 'PHP', 'MySQL'];
    const wagerOptions = [50, 100, 200, 500, 1000];

    // Modals & Notifications
    const [showExitModal, setShowExitModal] = useState(false);
    const [inviteError, setInviteError] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [isMuted, setIsMuted] = useState(() => {
        // Load mute state from localStorage
        const saved = localStorage.getItem('lobbyMusic_muted');
        return saved === 'true';
    });
    const audioRef = React.useRef(null);
    const { playClick, playSuccess, playCancel, playSelect, playCountdownVoice } = useSound();
    const [allFriends, setAllFriends] = useState([]);
    const [invitedFriendId, setInvitedFriendId] = useState(null);
    const [successInviteIds, setSuccessInviteIds] = useState(new Set());

    // Matchmaking Real-Time Queue
    const [matchmakingQueue, setMatchmakingQueue] = useState({});
    const channelRef = React.useRef(null);
    const matchmakingIntervalRef = React.useRef(null);

    // Add inviter to players when opened via invite, and reset on close
    useEffect(() => {
        if (isOpen) {
            if (initialInviter && initialInviter.id) {
                setPlayers(prev => {
                    // Don't add duplicates
                    if (prev.some(p => p.id === initialInviter.id)) return prev;
                    const inviterPlayer = {
                        id: initialInviter.id,
                        name: initialInviter.name || 'Player',
                        level: 1,
                        status: 'ready',
                        avatar: initialInviter.avatar || heroAsset,
                        heroImage: hero2Static,
                        rankName: initialInviter.rankName || '',
                        rankIcon: initialInviter.rankIcon || '',
                        rankId: null,
                        achievements: 0,
                        ms: '—',
                        logo: ccsLogo,
                        isReady: true
                    };
                    return [...prev, inviterPlayer];
                });
            }
        } else {
            // Reset state when closed
            setPlayers([{ ...currentUser, isReady: true }]);
            setMatchState('idle');
            setTimer(0);
            setSearchError(null);
            setInviteError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialInviter]);

    // Sync other players' full visual data from presence once it's available
    useEffect(() => {
        if (players.length > 1 && Object.keys(matchmakingQueue).length > 0) {
            let hasChanges = false;
            const updated = players.map(p => {
                if (p.id !== user?.id && matchmakingQueue[p.id]?.playerData) {
                    const queueData = matchmakingQueue[p.id].playerData;
                    // If they have a different hero image or we just want to ensure we have their full custom data
                    if (p.heroImage !== queueData.heroImage) {
                        hasChanges = true;
                        return { 
                            ...p, 
                            heroImage: queueData.heroImage,
                            // Keep their ready status intact
                        };
                    }
                }
                return p;
            });
            if (hasChanges) setPlayers(updated);
        }
    }, [matchmakingQueue, user, players]);

    // --- TIMERS & STATE MANAGEMENT ---

    // Unified Timer Tick
    useEffect(() => {
        let interval;
        if (matchState === 'searching' || matchState === 'ready_check' || matchState === 'starting') {
            interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 0) return 0;
                    if (matchState === 'starting') {
                        playCountdownVoice(prev.toString());
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [matchState]);

    // Format time mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Auto-Transition: Search Timeout
    useEffect(() => {
        if (matchState === 'searching' && timer === 0) {

            setMatchState('idle');
            setTimer(0);
            
            // Only keep the players who were already explicitly invited/were with us before search
            // If we just want to reset to our "base" group, we can just keep everyone who isn't a random match.
            // But right now we only add friends or ourselves to `players` before a match is found. 
            // So just keep the current `players` array since it represents our party, OR reset to party:
            setSearchError('No players found. Try again.');
            playCancel(); // Play a sound indicating failure
            setTimeout(() => setSearchError(null), 5000);
        }
    }, [matchState, timer, playCancel]);

    // Auto-Transition: Ready Check Timeout
    useEffect(() => {
        if (matchState === 'ready_check' && timer === 0) {
            handleReadyCheckComplete(); // Determine if we start or restart search
        }
    }, [matchState, timer]);

    // Auto-Transition: Game Start
    useEffect(() => {
        if (matchState === 'starting' && timer === 0) {
            const opponentData = players.filter(p => p.id !== user.id);
            navigate('/grand-arena/multiplayer', {
                state: {
                    opponents: opponentData,
                    wager: selectedWager?.toString() || '0',
                    language: selectedLanguage || 'Python'
                }
            });
        }
    }, [matchState, timer, navigate, players, selectedWager, selectedLanguage]);

    // --- REAL-TIME PRESENCE (MATCHMAKING QUEUE) ---
    useEffect(() => {
        if (!isOpen || !user) return;

        // Create a unique channel for the matchmaking lobby
        const channel = supabase.channel('matchmaking_queue', {
            config: {
                presence: {
                    key: user.id
                }
            }
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                
                // Flatten the presence state into a dictionary of users
                const activePlayers = {};
                for (const id in state) {
                    // Get the most recent presence state for each user
                    activePlayers[id] = state[id][0];
                }
                
                setMatchmakingQueue(activePlayers);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {

                // Remove player from our party UI if they leave presence
                setPlayers(prev => {
                    // Don't remove ourselves accidentally
                    if (key === user.id) return prev;
                    
                    const filtered = prev.filter(p => p.id !== key);
                    if (filtered.length !== prev.length) {
                        return filtered;
                    }
                    return prev;
                });
            })
            .on('broadcast', { event: 'match_found' }, (payload) => {
                // If we are part of the match group broadcasted by the host
                if (payload.payload.playerIds.includes(user.id) && matchState === 'searching') {

                    setPlayers(payload.payload.players);
                    startReadyPhase();
                }
            })
            .on('broadcast', { event: 'ready_status' }, (payload) => {
                // Sync ready status across the matched group
                const { userId, isReady } = payload.payload;
                if (matchState === 'ready_check') {
                    setPlayers(prev => prev.map(p => p.id === userId ? { ...p, isReady } : p));
                }
            })
            .on('broadcast', { event: 'multi-invite-accept' }, (payload) => {
                // If we are the host who invited them
                if (payload.payload.targetId === user.id) {

                    // Add them to our party UI
                    setPlayers(prev => {
                        if (prev.some(p => p.id === payload.payload.senderId)) return prev;
                        
                        const newPlayer = {
                            id: payload.payload.senderId,
                            name: payload.payload.senderName,
                            level: 1,
                            status: 'ready',
                            avatar: payload.payload.senderAvatar || heroAsset,
                            heroImage: hero2Static,
                            rankName: payload.payload.senderRankName || '',
                            rankIcon: payload.payload.senderRankIcon || '',
                            rankId: null,
                            achievements: 0,
                            ms: '—',
                            logo: ccsLogo,
                            isReady: true
                        };

                        const updatedPlayers = [...prev, newPlayer];

                        // Broadcast the full party list to ALL members so everyone stays in sync
                        setTimeout(() => {
                            if (channelRef.current) {
                                const playerIds = updatedPlayers.map(p => p.id);

                                channelRef.current.send({
                                    type: 'broadcast',
                                    event: 'party-sync',
                                    payload: {
                                        playerIds,
                                        players: updatedPlayers
                                    }
                                });
                            }
                        }, 100);

                        return updatedPlayers;
                    });

                    // Keep their invite button as a checkmark
                    setSuccessInviteIds(prev => new Set([...prev, payload.payload.senderId]));
                }
            })
            .on('broadcast', { event: 'party-sync' }, (payload) => {
                // All party members receive the full updated player list from the host
                const { playerIds, players: syncedPlayers } = payload.payload;
                if (playerIds.includes(user.id)) {

                    setPlayers(syncedPlayers);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Initially track us as 'idle' in the lobby
                    await channel.track({
                        id: user.id,
                        status: 'idle',
                        language: selectedLanguage,
                        mode: selectedMode,
                        wager: selectedWager,
                        playerData: currentUser // Send our visual data so others can see us
                    });

                    // If we joined via an invite, tell the host we are here!
                    if (initialInviter && initialInviter.id) {

                        await channel.send({
                            type: 'broadcast',
                            event: 'multi-invite-accept',
                            payload: {
                                targetId: initialInviter.id,
                                senderId: user.id,
                                senderName: user.name,
                                senderAvatar: user.avatar_url || currentUser.avatar,
                                senderRankName: currentUser.rankName,
                                senderRankIcon: currentUser.rankIcon
                            }
                        });
                    }
                }
            });

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            if (matchmakingIntervalRef.current) {
                clearInterval(matchmakingIntervalRef.current);
            }
        };
    }, [isOpen, user]);

    // Update our presence state when our settings or matchState changes
    useEffect(() => {
        if (channelRef.current && channelRef.current.state === 'joined') {
            channelRef.current.track({
                id: user.id,
                status: matchState,
                language: selectedLanguage,
                mode: selectedMode,
                wager: selectedWager,
                playerData: currentUser
            });
        }
    }, [matchState, selectedLanguage, selectedMode, selectedWager]);

    // Lobby music control
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isOpen && !isMuted && matchState !== 'starting') {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    }, [isOpen, isMuted, matchState]);

    // Notify parent to pause game music
    useEffect(() => {
        if (isOpen && onClose) {
            // Parent should handle pausing game music
        }
    }, [isOpen, onClose]);

    // Persist mute state to localStorage
    useEffect(() => {
        localStorage.setItem('lobbyMusic_muted', isMuted);
    }, [isMuted]);

    // --- FETCH FRIENDS ---
    const [friendRefreshTrigger, setFriendRefreshTrigger] = useState(0);

    const fetchFriends = React.useCallback(async () => {
        if (!user?.id) return;

        try {
            const result = await userAPI.getFriends();
            if (result?.friends) {
                const friendsList = result.friends.map(p => {
                    const rank = getRankData(p.xp || 0);
                    return {
                        id: p.id,
                        name: p.username || 'Unknown',
                        avatar: p.avatar_url,
                        rankName: rank.name,
                        rankIcon: rank.icon,
                        xp: p.xp || 0,
                        lastActiveAt: p.last_active_at
                    };
                });
                setAllFriends(friendsList);
            } else {
                setAllFriends([]);
            }
        } catch (err) {
            console.error('[MultiplayerLobby] Error fetching friends:', err);
            setAllFriends([]);
        }
    }, [user]);

    // Fetch friends on open and when the refresh trigger changes
    useEffect(() => {
        if (!isOpen || !user) return;
        fetchFriends();

        // Periodically re-fetch friends to get fresh last_active_at values
        const refreshInterval = setInterval(() => {
            fetchFriends();
        }, 15000); // every 15 seconds

        return () => clearInterval(refreshInterval);
    }, [isOpen, user, friendRefreshTrigger, fetchFriends]);

    // Real-time listener for friend request acceptances
    useEffect(() => {
        if (!isOpen || !user) return;

        const notifChannel = supabase
            .channel('multi-friend-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications' },
                (payload) => {
                    if (payload.new.type === 'friend_request' && payload.new.action_status === 'accepted') {
                        if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {

                            setFriendRefreshTrigger(prev => prev + 1);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(notifChannel);
        };
    }, [isOpen, user]);


    // --- MATCHMAKING LOGIC (REAL) ---

    // 1. Finding Match Loop (during 'searching')
    useEffect(() => {
        if (matchState === 'searching') {
            // Check for matches every 3 seconds while searching
            matchmakingIntervalRef.current = setInterval(async () => {
                if (!user || !user.id) return;

                // Only the "Host" of a potential match group should trigger the backend to avoid duplicate requests.
                // We determine the host simply by sorting the available IDs.
                
                // Find online players looking for the same settings
                const validCandidates = Object.values(matchmakingQueue).filter(p => 
                    p.status === 'searching' && 
                    p.language === selectedLanguage && 
                    p.mode === selectedMode &&
                    p.wager === selectedWager
                );

                // We need at least 2 players (including us) to form a match
                if (validCandidates.length >= 2) {
                    const candidateIds = validCandidates.map(p => p.id);
                    candidateIds.sort(); // Sort to deterministically pick a "host"

                    // Am I the host? (First ID alphabetically)
                    if (candidateIds[0] === user.id) {

                        try {
                            // Call K-Means Backend
                            // We ask for k=1 initially if low pop, but the algorithm auto-handles k limits
                            // We pass only the candidate IDs actually searching right now
                            const result = await algorithmAPI.matchmaking(user.id, 2, candidateIds);
                            
                            if (result.status === 'success' && result.suggested_opponents.length > 0) {

                                // Build the final player list from the cluster
                                const clusterPlayerIds = [user.id, ...result.suggested_opponents.map(o => o.player_id || o.id)];
                                
                                const finalPlayers = clusterPlayerIds.map(id => {
                                    const queueData = matchmakingQueue[id]?.playerData;
                                    if (queueData) {
                                        return { ...queueData, isReady: false };
                                    }
                                    return null;
                                }).filter(Boolean);

                                // Broadcast to other clustered players to join the match
                                if (channelRef.current) {
                                    channelRef.current.send({
                                        type: 'broadcast',
                                        event: 'match_found',
                                        payload: {
                                            playerIds: clusterPlayerIds,
                                            players: finalPlayers
                                        }
                                    });
                                }

                                // Update my own UI
                                setPlayers(finalPlayers);
                                startReadyPhase();
                            }
                        } catch (err) {
                            console.error('[Matchmaking] Backend Error:', err);
                        }
                    }
                }
            }, 3000);

            return () => clearInterval(matchmakingIntervalRef.current);
        }
    }, [matchState, matchmakingQueue, selectedLanguage, selectedMode, selectedWager, user]);

    // 2. Auto-Start if ALL ready
    useEffect(() => {
        if (matchState === 'ready_check') {
            const allReady = players.every(p => p.isReady);
            if (allReady && players.length >= 2) { // Changed minimum to 2 for a real match
                startGameCountdown();
            }
        }
    }, [matchState, players]);

    const startReadyPhase = () => {
        setMatchState('ready_check');
        setTimer(60); // Restart to 1 minute
        setPlayers(prev => prev.map(p => ({ ...p, isReady: false })));
    };

    // --- HANDLERS ---

    const handleFindMatch = () => {
        playClick();
        if (matchState === 'idle') {
            setMatchState('searching');
            setTimer(60); // Set to 1 minute search timeout
        } else if (matchState === 'searching') {
            // Cancel Search
            setMatchState('idle');
            setTimer(0);
            setPlayers([{ ...currentUser, isReady: true }]); // Reset back to just us
        }
    };

    const handleReadyClick = () => {
        playSuccess();
        if (matchState === 'ready_check') {
            setPlayers(prev => prev.map(p => p.id === user.id ? { ...p, isReady: true } : p));
            
            // Broadcast our ready status to the group
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'ready_status',
                    payload: { userId: user.id, isReady: true }
                });
            }
        }
    };


    const handleReadyCheckComplete = () => {
        // "if 1min is done... search again... only if opponent is one remaining"
        // "if 4 or 5 then 2 or 1 not ready... continue remaining as long as you and 2 other are ready"

        const readyCount = players.filter(p => p.isReady).length;

        // Condition: You + 1 other = 2 minimum ready
        if (readyCount >= 2) {
            // Filter out unready players and start
            setPlayers(prev => prev.filter(p => p.isReady));
            startGameCountdown();
        } else {
            // Not enough players ready.
            // "search again"
            setMatchState('searching');
            setTimer(60);
            // Keep only ready players? User said "search again for players only if its only the opponent is one remaining"
            // Let's reset to just the user (and maybe friends who were ready) to keep it clean, or keep the group.
            // Simplified: Resetting to search with current ready group.
            setPlayers(prev => prev.filter(p => p.isReady));
        }
    };

    const startGameCountdown = () => {
        setMatchState('starting');
        setTimer(5); // 5s countdown
    };

    const handleInvite = async (friend) => {
        if (invitedFriendId === friend.id) return;
        playClick();
        setInvitedFriendId(friend.id);
        setInviteError(null);

        const timeoutId = setTimeout(() => {
            setInvitedFriendId(null);
            setInviteError('Invite timed out. Try again.');
            setTimeout(() => setInviteError(null), 3000);
        }, 10000);

        try {
            await userAPI.sendDuelInvite(friend.id, user.name || 'Someone', null, 'multiplayer');
            setSuccessInviteIds(prev => new Set([...prev, friend.id]));
            playSuccess();
            setTimeout(() => {
                setSuccessInviteIds(prev => {
                    const next = new Set(prev);
                    next.delete(friend.id);
                    return next;
                });
            }, 10000);
        } catch (err) {
            console.error('Failed to send multi invite:', err);
            setInviteError('Failed to send invitation');
            setTimeout(() => setInviteError(null), 3000);
        } finally {
            clearTimeout(timeoutId);
            setInvitedFriendId(null);
        }
    };

    const handleBackClick = () => {
        playCancel();
        if (matchState !== 'idle') {
            setShowExitModal(true);
        } else {
            onBack();
        }
    };

    // --- RENDER HELPERS ---

    // A friend is online if Supabase Presence has their ID OR their last heartbeat was within 3 minutes
    const isOnline = (f) => {
        const inPresence = onlineUserIds.has(String(f.id)) || onlineUserIds.has(f.id);
        if (inPresence) return true;
        if (f.lastActiveAt) {
            const lastActive = new Date(f.lastActiveAt).getTime();
            const diff = Date.now() - lastActive;
            return diff < 180000; // 3 minutes
        }
        return false;
    };

    const friends = allFriends
        .filter(isOnline)
        .map(f => ({ ...f, status: 'online' }));

    const offlineFriends = allFriends
        .filter(f => !isOnline(f))
        .map(f => ({ ...f, status: 'offline' }));

    const slots = [0, 1, 2, 3, 4];
    const settingsLocked = matchState !== 'idle' || players.length > 1;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md font-galsb overflow-hidden">

                    {/* Background - Game Map BG */}
                    <div className="absolute inset-0">
                        <img src={gameMapBg} className="w-full h-full object-cover opacity-60" alt="Background" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1724] via-[#0f1724]/60 to-transparent" />
                        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay" />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="w-full h-full max-w-[1700px] relative z-10 flex flex-col pointer-events-auto"
                    >
                        {/* HEADER */}
                        <div className="h-16 flex items-center justify-between px-8 relative z-20">
                            {/* Left: Back & Title */}
                            <div className="flex items-center gap-4">
                                <button onClick={handleBackClick} className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-600 hover:border-red-500 hover:bg-red-500/20 transition-all duration-300 group">
                                    <X className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-transform duration-300 group-hover:rotate-90" />
                                </button>
                                <h1 className="text-2xl font-bold text-slate-200 tracking-wide">LOBBY MODE</h1>
                            </div>

                            {/* Center: Lobby Timer */}
                            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {matchState === 'searching' ? 'Finding Match...' : matchState === 'ready_check' ? 'Confirm Ready' : matchState === 'starting' ? 'Launching' : 'Auto-Start In'}
                                </span>
                                <span className={`text-xl font-black tracking-wider ${timer < 10 && timer > 0 ? 'text-rose-500' : 'text-slate-200'}`}>
                                    {formatTime(timer)}
                                </span>
                            </div>

                            {/* Right: Sound Toggle */}
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 flex overflow-hidden">

                            {/* LEFT SIDEBAR: MATCH SETTINGS */}
                            <div className="w-56 bg-black/60 border-r border-white/5 flex flex-col p-4 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Match Settings</h3>
                                {settingsLocked && (
                                    <div className="mb-3 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5">
                                        <span className="text-amber-400 text-[9px] font-black uppercase tracking-widest">🔒 Locked</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* Language */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Language</label>
                                        <div className="relative group">
                                            {!settingsLocked && <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {settingsLocked ? (
                                                <div className="w-full bg-[#0B1221] border border-white/10 text-white/50 font-bold text-xs px-3 py-2 rounded-lg cursor-not-allowed">
                                                    {selectedLanguage || 'N/A'}
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedLanguage}
                                                    onChange={(e) => { playSelect(); setSelectedLanguage(e.target.value); }}
                                                    className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-xs px-3 py-2 rounded-lg appearance-none relative z-10 focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                                                >
                                                    {languages.map((lang) => (
                                                        <option key={lang} value={lang}>{lang}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {!settingsLocked && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 z-20 pointer-events-none" />}
                                        </div>
                                    </div>

                                    {/* Mode */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mode</label>
                                        <div className="relative group">
                                            {!settingsLocked && <div className="absolute inset-0 bg-violet-500/20 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {settingsLocked ? (
                                                <div className="w-full bg-[#0B1221] border border-white/10 text-white/50 font-bold text-xs px-3 py-2 rounded-lg cursor-not-allowed">
                                                    {selectedMode || 'N/A'}
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedMode}
                                                    onChange={(e) => { playSelect(); setSelectedMode(e.target.value); }}
                                                    className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-xs px-3 py-2 rounded-lg appearance-none relative z-10 focus:border-violet-500 focus:outline-none transition-colors cursor-pointer"
                                                >
                                                    <option>Puzzle Blocks</option>
                                                    <option>Blocks</option>
                                                    <option>Hardcode</option>
                                                </select>
                                            )}
                                            {!settingsLocked && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 z-20 pointer-events-none" />}
                                        </div>
                                    </div>


                                    {/* Wager */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wager (EXP)</label>
                                        <div className="relative group">
                                            {!settingsLocked && <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {settingsLocked ? (
                                                <div className="w-full bg-[#0B1221] border border-white/10 text-white/50 font-bold text-xs px-3 py-2 rounded-lg cursor-not-allowed">
                                                    {selectedWager} EXP
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedWager}
                                                    onChange={(e) => { playSelect(); setSelectedWager(Number(e.target.value)); }}
                                                    className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-xs px-3 py-2 rounded-lg appearance-none relative z-10 focus:border-amber-500 focus:outline-none transition-colors cursor-pointer"
                                                >
                                                    {wagerOptions.map((amount) => (
                                                        <option key={amount} value={amount}>{amount} EXP</option>
                                                    ))}
                                                </select>
                                            )}
                                            {!settingsLocked && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 z-20 pointer-events-none" />}
                                        </div>
                                    </div>

                                    {/* Time Limit */}
                                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-0.5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Time Limit</p>
                                        <p className="text-lg font-black text-white">10:00</p>
                                    </div>
                                </div>

                                {/* FIND MATCH / READY CHECK BUTTON — pinned to sidebar bottom */}
                                <div className="mt-auto pt-4 border-t border-white/5">
                                    {inviteError && (
                                        <div className="mb-2 bg-rose-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold">
                                            {inviteError}
                                        </div>
                                    )}
                                    {searchError && (
                                        <div className="mb-2 bg-rose-500/20 border border-rose-500 text-rose-200 px-3 py-2 rounded-lg text-xs font-bold text-center">
                                            {searchError}
                                        </div>
                                    )}
                                    {matchState === 'ready_check' ? (
                                        <button
                                            onClick={handleReadyClick}
                                            disabled={players.find(p => p.id === user.id)?.isReady}
                                            className={`w-full h-11 rounded-xl border-2 flex items-center justify-center gap-2 transition-all text-xs font-black uppercase tracking-widest ${players.find(p => p.id === user.id)?.isReady
                                                ? 'bg-emerald-600 border-emerald-400 text-white cursor-default'
                                                : 'bg-gradient-to-b from-amber-400 to-orange-500 border-amber-300 text-black hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                                                }`}
                                        >
                                            {players.find(p => p.id === user.id)?.isReady ? 'Ready!' : 'Click to Ready'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleFindMatch}
                                            disabled={matchState === 'searching' || !!initialInviter}
                                            className={`w-full h-11 rounded-xl border-2 flex items-center justify-center gap-2 transition-all text-xs font-black uppercase tracking-widest ${
                                                !!initialInviter
                                                ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                                                : matchState === 'searching'
                                                ? 'bg-slate-700 border-slate-500 text-slate-300'
                                                : 'bg-gradient-to-b from-yellow-300 to-amber-500 border-yellow-200/50 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-black hover:scale-105'
                                                }`}
                                        >
                                            {!!initialInviter ? 'Waiting for Host...' : matchState === 'searching' ? 'Searching...' : 'Find Match'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* CENTER: BANNERS + FIND MATCH BUTTON */}
                            <div className="flex-1 flex flex-col overflow-hidden relative">
                                <div className="flex-1 flex items-center justify-center overflow-hidden px-4 pt-4">
                                    <div className="flex items-start justify-center gap-3 w-full">
                                        {slots.map((i) => {
                                            const player = players[i];

                                            // Determine Rank Display
                                            let displayRankName = '';
                                            let displayRankIcon = null;

                                            if (player) {
                                                if (player.rankName && player.rankIcon) {
                                                    // Use direct properties (for Current User)
                                                    displayRankName = player.rankName;
                                                    displayRankIcon = player.rankIcon;
                                                } else if (player.rankId) {
                                                    // Use lookup (for Friends/Bots)
                                                    const r = getRank(player.rankId);
                                                    displayRankName = r.name;
                                                    displayRankIcon = r.icon;
                                                }
                                            }

                                            // Visual State: Grey if in ready_check and not ready
                                            const isGrey = matchState === 'ready_check' && !player?.isReady;

                                            return (
                                                <div key={i} className="relative group w-44 h-[520px] shrink-0">
                                                    {/* Background Banner Shape */}
                                                    <div
                                                        className={`absolute inset-0 transition-all duration-300 ${player
                                                            ? (isGrey ? 'bg-slate-800 border-t-4 border-slate-600 grayscale' : 'bg-gradient-to-b from-cyan-900/80 to-blue-900/80 border-t-4 border-cyan-400')
                                                            : 'bg-slate-800/40 border-t-4 border-slate-600/40'
                                                            }`}
                                                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)' }}
                                                    />

                                                    {player ? (
                                                        <>
                                                            {/* Hero Image — detached from clipPath so weapons/staffs can pop out uncropped */}
                                                            <div className={`absolute inset-x-[-20%] bottom-14 top-20 z-10 pointer-events-none flex items-end justify-center ${isGrey ? 'opacity-50' : 'opacity-100'}`}>
                                                                <motion.img
                                                                    initial={{ scale: 1.0 }}
                                                                    animate={{ scale: isGrey ? 0.90 : 0.95 }}
                                                                    src={player.heroImage || player.avatar}
                                                                    className={`w-full max-h-[95%] object-contain object-bottom transition-all duration-700 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] ${isGrey ? 'brightness-50 grayscale' : 'brightness-110'}`}
                                                                    alt="Hero"
                                                                />
                                                            </div>

                                                            {/* Bottom Dark Gradient for Rank readability */}
                                                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none rounded-b-xl" />

                                                            {/* UI Elements (Avatar, Name, Rank) */}
                                                            <div className={`absolute inset-0 z-20 flex flex-col items-center h-full pointer-events-none ${isGrey ? 'opacity-50' : 'opacity-100'}`}>
                                                                <div className="relative flex flex-col items-center pt-4 px-2 w-full">
                                                                    <div className={`w-14 h-14 rounded-lg border-2 p-0.5 mb-1.5 transition-all duration-500 pointer-events-auto ${isGrey ? 'border-slate-500' : 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'}`}>
                                                                        <img src={player.avatar} className="w-full h-full object-cover rounded-md" alt="" />
                                                                    </div>
                                                                    <h3 className={`text-[10px] font-black italic uppercase tracking-tighter text-center truncate w-full drop-shadow-[0_2px_8px_rgba(0,0,0,1)] ${isGrey ? 'text-slate-400' : 'text-white'}`}>{player.name}</h3>
                                                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] drop-shadow-sm ${isGrey ? 'text-slate-500' : 'text-cyan-400'}`}>{displayRankName}</span>
                                                                </div>

                                                                {/* Rank Icon */}
                                                                <div className="relative flex flex-col items-center pb-6 mt-auto w-full">
                                                                    <img src={displayRankIcon} className={`w-12 h-12 object-contain drop-shadow-2xl transition-all ${isGrey ? 'grayscale opacity-50' : 'scale-110'}`} alt="Rank" />
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                                                            <div className="w-20 h-20 border-2 border-white/20 flex items-center justify-center text-4xl font-bold text-white/20 mb-4">?</div>
                                                            <p className="text-xs text-center px-4">Waiting for Player...</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDEBAR: FRIENDS LIST */}
                            <div className="w-72 bg-gradient-to-l from-slate-900/90 to-transparent p-5 overflow-y-auto pt-8 border-l border-white/5">
                                {/* Navigation Tabs */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] mb-2">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/80">Community</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)]" />
                                    </div>
                                </div>

                                {/* Friends Section */}
                                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">
                                    <span>Friends</span>
                                    <ChevronDown className="w-3 h-3" />
                                </div>

                                <div className="space-y-3 mb-6">
                                    {friends.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                                            <User className="w-8 h-8 text-slate-700 mb-2" />
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">No friends online</p>
                                        </div>
                                    ) : (
                                        friends.map(friend => {
                                            const isInParty = players.some(p => p.id === friend.id);
                                            const isInvited = successInviteIds.has(friend.id) || isInParty;

                                            return (
                                                <div key={friend.id} className="p-2.5 rounded-xl hover:bg-white/5 flex items-center gap-3 group transition-all cursor-pointer border border-transparent hover:border-white/5">
                                                    <div className="relative shrink-0">
                                                        <div className="absolute -inset-1 bg-cyan-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <img src={friend.avatar} className="w-10 h-10 rounded-lg border border-white/20 relative z-10" alt="" />
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full z-20" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-xs font-black text-slate-200 truncate block tracking-tight group-hover:text-white transition-colors">{friend.name}</span>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <img src={friend.rankIcon} className="w-4 h-4 object-contain" alt="" />
                                                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider truncate">{friend.rankName}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleInvite(friend);
                                                        }}
                                                        disabled={invitedFriendId === friend.id || isInvited}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all shrink-0 ${isInvited
                                                            ? 'bg-blue-600/50 cursor-default'
                                                            : invitedFriendId === friend.id
                                                                ? 'bg-amber-600/50 cursor-not-allowed'
                                                                : 'bg-emerald-600 hover:bg-emerald-500 hover:scale-110 active:scale-95 shadow-lg shadow-emerald-900/20'
                                                            }`}
                                                    >
                                                        {isInvited ? (
                                                            <Check className="w-4 h-4 text-blue-200" />
                                                        ) : invitedFriendId === friend.id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Offline Section */}
                                <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1 border-t border-white/5 pt-2">
                                    <span>Offline</span>
                                </div>

                                <div className="space-y-2 opacity-50">
                                    {offlineFriends.map(friend => {
                                        return (
                                            <div key={friend.id} className="p-3 rounded-lg flex items-center gap-4 transition-colors">
                                                <div className="relative grayscale shrink-0">
                                                    <img src={friend.avatar} className="w-12 h-12 rounded-lg border border-white/10" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-bold text-slate-400 truncate block">{friend.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <img src={friend.rankIcon} className="w-8 h-8 object-contain opacity-50" alt="" />
                                                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{friend.rankName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        </div>

                    </motion.div>

                    {/* Lobby Music */}
                    <audio
                        ref={audioRef}
                        src={lobbyMusic}
                        loop
                        volume={0.8}
                        preload="auto"
                    />


                    {/* EXIT CONFIRMATION MODAL */}
                    <AnimatePresence>
                        {showExitModal && (
                            <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl relative"
                                >
                                    <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/10 mb-2 flex items-center justify-center overflow-hidden">
                                        {user.avatar ? (
                                            <img src={user.avatar} className="w-full h-full object-cover" alt="User Avatar" />
                                        ) : (
                                            <User className="w-8 h-8 text-slate-600" />
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Leave Lobby?</h3>
                                    <p className="text-slate-400 text-sm mb-6">You will be removed from the queue.</p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowExitModal(false)}
                                            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowExitModal(false);
                                                // Reset Lobby State
                                                setPlayers([{ ...currentUser, isReady: true }]);
                                                setMatchState('idle');
                                                setTimer(0);
                                                onBack();
                                            }}
                                            className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20"
                                        >
                                            Leave
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* GAME START COUNTDOWN MODAL */}
                    <AnimatePresence>
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
                                        key="timer"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                    >
                                        {timer}
                                    </motion.div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                </div >
            )
            }
        </AnimatePresence >
    );
};

export default MultiplayerLobbyModal;
