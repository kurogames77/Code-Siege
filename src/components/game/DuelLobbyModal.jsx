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
import { authAPI, userAPI, battlesAPI, coursesAPI } from '../../services/api';
import { getRankFromExp } from '../../utils/rankSystem';
import rankGold from '../../assets/rankbadges/rank6.png';
import rankSilver from '../../assets/rankbadges/rank3.png';
import rankDiamond from '../../assets/rankbadges/rank12.png';
import { getRankFromExp as getRankData } from '../../utils/rankSystem';
import { useToast } from '../../contexts/ToastContext';

const DuelLobbyModal = ({ isOpen, onClose, onBack, initialOpponent }) => {
    const navigate = useNavigate();
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
    const [selectedMode, setSelectedMode] = useState('Puzzle Blocks');
    const [selectedWager, setSelectedWager] = useState('100');
    
    // Level Validation State
    const [hasLevels, setHasLevels] = useState(false);
    const [isCheckingLevels, setIsCheckingLevels] = useState(false);

    useEffect(() => {
        const checkLevels = async () => {
            if (!selectedLanguage || courses.length === 0) {
                setHasLevels(false);
                return;
            }
            setIsCheckingLevels(true);
            try {
                const matchingCourse = courses.find(c => c.name === selectedLanguage);
                if (matchingCourse) {
                    const dbMode = selectedMode === 'Puzzle Blocks' ? 'Beginner' : selectedMode === 'Blocks' ? 'Intermediate' : 'Advance';
                    const levels = await coursesAPI.getLevels(matchingCourse.id, dbMode, selectedDifficulty);
                    setHasLevels(levels && levels.length > 0);
                } else {
                    setHasLevels(false);
                }
            } catch (err) {
                setHasLevels(false);
            } finally {
                setIsCheckingLevels(false);
            }
        };
        if (isOpen) {
            checkLevels();
        }
    }, [selectedLanguage, selectedMode, selectedDifficulty, courses, isOpen]);
    const { playClick, playSuccess, playCancel, playSelect, playCountdownVoice } = useSound();
    const { user, onlineUserIds } = useUser();

    // Fetch courses via backend API (bypasses RLS)
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await coursesAPI.getCourses();

                if (data && data.length > 0) {
                    const uniqueCourses = Array.from(new Map(data.map(item => [item.name, item])).values());
                    setCourses(uniqueCourses);
                    setSelectedLanguage(uniqueCourses[0].name);
                } else {
                    console.warn('[DuelLobby] No courses found.');
                }
            } catch (err) {
                console.error('[DuelLobby] Critical error in fetchCourses:', err);
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
    const [lobbyId, setLobbyId] = useState(null);
    const [battleRecordId, setBattleRecordId] = useState(null); // Host generated battle id

    // Refs to avoid stale closures in broadcast handlers
    const matchStateRef = React.useRef(matchState);
    const opponentRef = React.useRef(opponent);
    const selectedLanguageRef = React.useRef(selectedLanguage);
    const selectedDifficultyRef = React.useRef(selectedDifficulty);
    const selectedModeRef = React.useRef(selectedMode);
    const selectedWagerRef = React.useRef(selectedWager);
    React.useEffect(() => { matchStateRef.current = matchState; }, [matchState]);
    React.useEffect(() => { opponentRef.current = opponent; }, [opponent]);
    React.useEffect(() => { selectedLanguageRef.current = selectedLanguage; }, [selectedLanguage]);
    React.useEffect(() => { selectedDifficultyRef.current = selectedDifficulty; }, [selectedDifficulty]);
    React.useEffect(() => { selectedModeRef.current = selectedMode; }, [selectedMode]);
    React.useEffect(() => { selectedWagerRef.current = selectedWager; }, [selectedWager]);
    const userRef = React.useRef(user);
    React.useEffect(() => { userRef.current = user; }, [user]);

    // MODALS
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [modalMode, setModalMode] = useState('opponent'); // 'friend' | 'opponent'
    const [showExitModal, setShowExitModal] = useState(false);

    // --- FULL STATE RESET ---
    // Called whenever the lobby needs to be fully cleared (on close, on cancel, on opponent leave)
    const resetLobbyState = React.useCallback(() => {
        setMatchState('idle');
        setOpponent(null);
        setIsUserReady(false);
        setIsOpponentReady(false);
        setTimer(0);
        setStartCountdown(5);
        setOnlineUsers([]);
        setInvitedFriendId(null);
        setSuccessInviteIds(new Set());
        setLobbyId(null); // Force a fresh lobbyId on next open
        setBattleRecordId(null);
        setShowExitModal(false);
        acceptSentRef.current = false;
        if (hostCheckRetryRef.current) { clearTimeout(hostCheckRetryRef.current); hostCheckRetryRef.current = null; }
        opponentRef.current = null;
        matchStateRef.current = 'idle';
    }, []);

    // Set initial opponent and lobby from prop (when accepting a duel invite)
    // This handles both first invites AND subsequent re-invites with a new lobbyId
    useEffect(() => {
        if (isOpen && initialOpponent) {
            // If the incoming invite has a DIFFERENT lobbyId than what we currently have,
            // we need to switch channels (handles second invite scenario)
            if (initialOpponent.lobbyId && lobbyId && initialOpponent.lobbyId !== lobbyId) {
                // Cleanup old channel before switching
                if (lobbyChannelRef.current) {
                    lobbyChannelRef.current.untrack().catch(() => {});
                    lobbyChannelRef.current.send({
                        type: 'broadcast',
                        event: 'player-leave',
                        payload: { playerId: user?.id }
                    }).catch(() => {});
                    const oldCh = lobbyChannelRef.current;
                    lobbyChannelRef.current = null;
                    setTimeout(() => supabase.removeChannel(oldCh), 200);
                }
                // Reset state for new lobby
                setOpponent(initialOpponent);
                setMatchState('lobby');
                setTimer(60);
                setIsUserReady(false);
                setIsOpponentReady(false);
                setStartCountdown(5);
                acceptSentRef.current = false;
                opponentRef.current = initialOpponent;
                matchStateRef.current = 'lobby';
                setLobbyId(initialOpponent.lobbyId);
                return;
            }

            // First time joining: set opponent and lobby
            if (!opponent) {
                setOpponent(initialOpponent);
                setMatchState('lobby');
                setTimer(60);
            }
            if (initialOpponent.lobbyId && !lobbyId) {
                setLobbyId(initialOpponent.lobbyId);
            }
        }
    }, [isOpen, initialOpponent, opponent, lobbyId, user?.id]);

    // Generate lobbyId for host
    useEffect(() => {
        if (isOpen && !lobbyId && !initialOpponent) {
            const id = Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
            setLobbyId(id);
        }
    }, [isOpen, lobbyId, initialOpponent]);

    // Get selected hero with unlock validation
    // Hero unlock levels: Nyx(hero2)=1, Valerius(hero1a)=4, Ignis(hero3)=7, Daemon(hero4)=10
    const heroUnlockLevels = {
        'hero1a.png': 4,  // Valerius
        'hero2.png': 1,   // Nyx (default, always unlocked)
        'hero3.png': 7,   // Ignis
        'hero4.png': 10   // Daemon
    };
    const heroMap = {
        'hero1a.png': hero1aStatic,
        'hero2.png': hero2Static,
        'hero3.png': hero3Static,
        'hero4.png': hero4Static
    };
    const rawSelectedHero = localStorage.getItem('selectedHeroImage') || 'hero2.png';
    const userLevel = user?.level || 1;
    // Validate: if the selected hero requires a higher level, fall back to Nyx (hero2)
    const requiredLevel = heroUnlockLevels[rawSelectedHero] || 1;
    const validatedHeroImage = userLevel >= requiredLevel ? rawSelectedHero : 'hero2.png';
    const currentHeroImage = heroMap[validatedHeroImage] || hero2Static;
    const [startCountdown, setStartCountdown] = useState(5); // Launch countdown

    // AUDIO
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('lobbyMusic_muted');
        return saved === 'true';
    });
    const audioRef = React.useRef(null);

    const [friends, setFriends] = useState([]);
    const [friendRefreshTrigger, setFriendRefreshTrigger] = useState(0);

    // --- FETCH FRIENDS ---
    const fetchFriends = React.useCallback(async () => {
        if (!user) return;

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
                        course: p.course || 'N/A',
                        lastActiveAt: p.last_active_at
                    };
                });
                setFriends(friendsList);
            } else {
                setFriends([]);
            }
        } catch (err) {
            console.error('[DuelLobby] Error fetching friends:', err);
            setFriends([]);
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
            .channel('duel-friend-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications' },
                (payload) => {
                    // Re-fetch friends when a friend_request gets accepted
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

    // Status is now derived during render

    // --- REALTIME PRESENCE & BROADCAST ---
    const lobbyChannelRef = React.useRef(null);
    const acceptSentRef = React.useRef(false);
    const hostCheckRetryRef = React.useRef(null);

    // Full reset when modal is closed (isOpen → false)
    useEffect(() => {
        if (!isOpen) {
            acceptSentRef.current = false;
            // ALWAYS untrack presence + broadcast leave when modal closes
            // This ensures the opponent immediately sees us leave
            const ch = lobbyChannelRef.current;
            if (ch) {
                lobbyChannelRef.current = null; // Prevent double-cleanup
                // Broadcast explicit player-leave BEFORE removing the channel
                const leavePayload = {
                    type: 'broadcast',
                    event: 'player-leave',
                    payload: { playerId: user?.id }
                };
                // Send leave broadcast multiple times to ensure delivery
                ch.send(leavePayload).catch(() => {});
                setTimeout(() => ch.send(leavePayload).catch(() => {}), 300);
                setTimeout(() => ch.send(leavePayload).catch(() => {}), 800);
                ch.untrack().catch(() => {});
                // Delay channel removal to allow the broadcasts to propagate
                setTimeout(() => supabase.removeChannel(ch), 1500);
                resetLobbyState();
            } else {
                resetLobbyState();
            }
        }
    }, [isOpen, resetLobbyState, user?.id]);

    useEffect(() => {
        if (!isOpen || !user?.id || !lobbyId) return;

        // Use ref to get latest user data without triggering channel recreation
        const currentUser = userRef.current || user;

        const channel = supabase.channel(`duel-lobby-${lobbyId}`, {
            config: {
                presence: {
                    key: currentUser.id,
                }
            },
        });

        lobbyChannelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.values(state)
                    .flat()
                    .filter(u => u.id !== currentUser.id)
                    .map(u => ({
                        ...u,
                        status: 'online'
                    }));
                setOnlineUsers(users);

                // HOST FALLBACK: If we are the host and don't have an opponent yet,
                // detect any other player in the presence state and capture them.
                // This is critical when the 'join' event gets missed due to REST fallback.
                if (!initialOpponent && !opponentRef.current && users.length > 0) {
                    const guest = users[0];
                    playSuccess();
                    setOpponent({
                        id: guest.id,
                        name: guest.name,
                        avatar: guest.avatar,
                        rankName: guest.rankName,
                        rankIcon: guest.rankIcon,
                        heroImage: heroMap[guest.heroImageKey] || hero2Static
                    });
                    setMatchState('lobby');
                    setIsUserReady(false);
                    setIsOpponentReady(false);
                    setTimer(60);

                    // Host sends current settings to the guest
                    channel.send({
                        type: 'broadcast',
                        event: 'sync-settings',
                        payload: {
                            targetId: guest.id,
                            language: selectedLanguageRef.current || (courses.length > 0 ? courses[0].name : ''),
                            difficulty: selectedDifficultyRef.current,
                            mode: selectedModeRef.current,
                            wager: selectedWagerRef.current
                        }
                    });
                }

            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                const guest = newPresences.find(u => String(u.id) !== String(currentUser.id));
                // If we are the host, robustly capture the opponent immediately when they join the Presence channel 
                if (!initialOpponent && !opponentRef.current) {
                    if (guest) {
                        playSuccess();
                        setOpponent({
                            id: guest.id,
                            name: guest.name,
                            avatar: guest.avatar,
                            rankName: guest.rankName,
                            rankIcon: guest.rankIcon,
                            heroImage: heroMap[guest.heroImageKey] || hero2Static
                        });
                        setMatchState('lobby');
                        setIsUserReady(false);
                        setIsOpponentReady(false);
                        setTimer(60);

                        // Host sends current settings to the joining guest
                        channel.send({
                            type: 'broadcast',
                            event: 'sync-settings',
                            payload: {
                                targetId: guest.id,
                                language: selectedLanguageRef.current || (courses.length > 0 ? courses[0].name : ''),
                                difficulty: selectedDifficultyRef.current,
                                mode: selectedModeRef.current,
                                wager: selectedWagerRef.current
                            }
                        });
                    }
                } else if (!initialOpponent && opponentRef.current) {
                    // Host already has an opponent, reject any other guest!
                    if (guest && String(guest.id) !== String(opponentRef.current.id)) {
                        channel.send({
                            type: 'broadcast',
                            event: 'lobby-full',
                            payload: { targetId: guest.id }
                        });
                    }
                }
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // Detect opponent leaving via presence leave event
                if (matchStateRef.current === 'starting') return; // GUARD: Do not abort an active launch sequence
                
                // Ignore leave if they are still tracked in presenceState (e.g., ghost unmount)
                const state = channel.presenceState();
                const isStillHere = Boolean(state[key] && state[key].length > 0);
                if (isStillHere) return;

                const currentOpponent = opponentRef.current;
                if (currentOpponent) {
                    const opponentLeft = leftPresences.some(p => String(p.id) === String(currentOpponent.id)) ||
                        String(key) === String(currentOpponent.id);
                    if (opponentLeft) {
                        setOpponent(null);
                        setMatchState('idle');
                        setIsUserReady(false);
                        setIsOpponentReady(false);
                        setTimer(0);
                        setStartCountdown(5); // cancel any in-progress launch
                    }
                }
            })
            .on('broadcast', { event: 'player-leave' }, ({ payload }) => {
                // Explicit leave broadcast: ALWAYS reset lobby — no state guard
                if (matchStateRef.current === 'starting') return; // GUARD: Do not abort an active launch sequence

                const currentOpponent = opponentRef.current;
                if (currentOpponent && String(payload.playerId) === String(currentOpponent.id)) {

                    setOpponent(null);
                    setMatchState('idle');
                    setIsUserReady(false);
                    setIsOpponentReady(false);
                    setTimer(0);
                    setStartCountdown(5); // Reset countdown so next match starts fresh
                }
            })
            .on('broadcast', { event: 'duel-invite' }, ({ payload }) => {
                if (String(payload.targetId) === String(currentUser.id)) {

                    // No longer auto-accepting. NotificationModal handles the UI.
                }
            })
            .on('broadcast', { event: 'lobby-full' }, ({ payload }) => {
                if (String(payload.targetId) === String(currentUser.id)) {
                    toast.error('This duel lobby is full — the match already has an opponent.');
                    onBack();
                }
            })
            .on('broadcast', { event: 'duel-accept' }, ({ payload }) => {
                // If we are the sender (host) and the recipient (guest) accepted

                if (String(payload.targetId) === String(currentUser.id)) {
                    // GUARD: If we already have an opponent, reject the late acceptor
                    if (opponentRef.current && String(opponentRef.current.id) !== String(payload.senderId)) {
                        console.log('[DuelLobby] Already have opponent, rejecting late acceptor:', payload.senderId);
                        channel.send({
                            type: 'broadcast',
                            event: 'lobby-full',
                            payload: { targetId: payload.senderId }
                        });
                        return;
                    }
                    playSuccess();
                    setOpponent({
                        id: payload.senderId,
                        name: payload.senderName,
                        avatar: payload.senderAvatar,
                        rankName: payload.senderRankName,
                        rankIcon: payload.senderRankIcon,
                        heroImage: heroMap[payload.senderHeroImageKey] || hero2Static
                    });
                    setMatchState('lobby');
                    setIsUserReady(false);
                    setIsOpponentReady(false);
                    setTimer(60);

                    // Host sends current settings to the guest
                    channel.send({
                        type: 'broadcast',
                        event: 'sync-settings',
                        payload: {
                            targetId: payload.senderId,
                            language: selectedLanguageRef.current || (courses.length > 0 ? courses[0].name : ''),
                            difficulty: selectedDifficultyRef.current,
                            mode: selectedModeRef.current,
                            wager: selectedWagerRef.current
                        }
                    });
                }
            })
            .on('broadcast', { event: 'sync-settings' }, ({ payload }) => {
                // Guest receives the host's match settings
                if (String(payload.targetId) === String(currentUser.id) || payload.targetId === '*') {

                    if (payload.language) setSelectedLanguage(payload.language);
                    setSelectedDifficulty(payload.difficulty);
                    setSelectedMode(payload.mode);
                    setSelectedWager(payload.wager);
                }
            })
            .on('broadcast', { event: 'player-ready' }, ({ payload }) => {
                // Use ref to check opponent to avoid stale closure
                const currentOpponent = opponentRef.current;

                if (currentOpponent && String(payload.playerId) === String(currentOpponent.id)) {
                    setIsOpponentReady(payload.isReady);
                }
            })
            .on('broadcast', { event: 'game-start' }, ({ payload }) => {
                if (String(payload.targetId) === String(currentUser.id) && matchStateRef.current !== 'starting') {

                    setBattleRecordId(payload.battleRecordId);
                    setMatchState('starting');
                    setStartCountdown(5);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: currentUser.id,
                        name: currentUser.name,
                        avatar: currentUser.avatar,
                        rankName: currentUser.rankName,
                        rankIcon: currentUser.rankIcon,
                        heroImageKey: validatedHeroImage,
                        online_at: new Date().toISOString(),
                    });

                    // If we're the invited player, send duel-accept to the host
                    if (initialOpponent && !acceptSentRef.current) {
                        acceptSentRef.current = true;

                        setTimeout(async () => {
                            const acceptPayload = {
                                type: 'broadcast',
                                event: 'duel-accept',
                                payload: {
                                    targetId: initialOpponent.id,
                                    senderId: currentUser.id,
                                    senderName: currentUser.name,
                                    senderAvatar: currentUser.avatar,
                                    senderRankName: currentUser.rankName,
                                    senderRankIcon: currentUser.rankIcon,
                                    senderHeroImageKey: validatedHeroImage
                                }
                            };
                            await channel.send(acceptPayload);
                            // Redundancy payload broadcasts to prevent websocket race condition drops during pairing
                            setTimeout(() => lobbyChannelRef.current?.send(acceptPayload).catch(() => {}), 1000);
                            setTimeout(() => lobbyChannelRef.current?.send(acceptPayload).catch(() => {}), 3000);
                        }, 500);
                    }
                }
            });

        // Helper: check if the host is still in the lobby Presence state
        const checkHostPresence = () => {
            if (!lobbyChannelRef.current) return false;
            const state = lobbyChannelRef.current.presenceState();
            const allPlayers = Object.values(state).flat();
            return allPlayers.some(p => String(p.id) === String(initialOpponent.id));
        };

        // Give Presence more time to sync — REST fallback makes presence inherently slower
        // First check at 10s, then retry at 15s, then final check at 20s
        const hostCheckTimeout = initialOpponent ? setTimeout(() => {
            if (checkHostPresence()) return; // Host is here, all good
            if (opponentRef.current) return; // Already connected via duel-accept broadcast

            // Retry after 5 more seconds (Presence over REST fallback can be very slow)
            const retryTimeout = setTimeout(() => {
                if (checkHostPresence()) return; // Host appeared on retry
                if (opponentRef.current) return; // Connected via broadcast

                // Final retry after 5 more seconds
                const finalRetry = setTimeout(() => {
                    if (checkHostPresence()) return;
                    if (opponentRef.current) return;

                    // Host is truly gone
                    toast.error('Friend is no longer in the lobby (match may have started).');
                    onBack();
                }, 5000);

                hostCheckRetryRef.current = finalRetry;
            }, 5000);

            // Store retry timeout for cleanup
            hostCheckRetryRef.current = retryTimeout;
        }, 10000) : null;


        return () => {
            if (hostCheckTimeout) clearTimeout(hostCheckTimeout);
            if (hostCheckRetryRef.current) clearTimeout(hostCheckRetryRef.current);
            // Skip cleanup if the channel was already cleaned up by isOpen handler
            if (lobbyChannelRef.current !== channel) return;
            lobbyChannelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [isOpen, user?.id, lobbyId]);

    // --- HOST FALLBACK: DB POLLING FOR INVITE ACCEPTANCE ---
    // When WebSocket/Realtime fails, the host polls the database to detect if the guest accepted
    useEffect(() => {
        // Only run for the host (no initialOpponent), only when lobby is open and we have a lobbyId
        if (!isOpen || !user?.id || !lobbyId || initialOpponent) return;

        const pollInterval = setInterval(async () => {
            // Stop polling once we already have an opponent
            if (opponentRef.current) return;

            try {
                const result = await userAPI.getSentInviteStatus(lobbyId);
                const accepted = result?.acceptedInvites;
                if (accepted && accepted.length > 0 && !opponentRef.current) {
                    const guest = accepted[0].acceptedBy;
                    if (!guest) return;

                    console.log('[DuelLobby] DB polling detected accepted invite from:', guest.username);
                    const guestRank = getRankFromExp(guest.xp || 0);
                    playSuccess();
                    setOpponent({
                        id: guest.id,
                        name: guest.username,
                        avatar: guest.avatar_url,
                        rankName: guestRank.name,
                        rankIcon: guestRank.icon,
                        heroImage: hero2Static // Default; will be updated from presence if available
                    });
                    setMatchState('lobby');
                    setIsUserReady(false);
                    setIsOpponentReady(false);
                    setTimer(60);

                    // Send settings sync to the guest via channel
                    if (lobbyChannelRef.current) {
                        lobbyChannelRef.current.send({
                            type: 'broadcast',
                            event: 'sync-settings',
                            payload: {
                                targetId: guest.id,
                                language: selectedLanguageRef.current || '',
                                difficulty: selectedDifficultyRef.current,
                                mode: selectedModeRef.current,
                                wager: selectedWagerRef.current
                            }
                        });
                    }
                }
            } catch (err) {
                // Silent fail — polling is a fallback
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [isOpen, user?.id, lobbyId, initialOpponent]);

    // --- TIMERS ---

    // Lobby Timer (60s -> 0) — only runs when both matchState is 'lobby' AND opponent is present AND levels exist
    useEffect(() => {
        let interval;
        if (matchState === 'lobby' && timer > 0 && opponent && hasLevels) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (matchState === 'lobby' && timer === 0 && opponentRef.current && opponent) {
            // GUARD: Do NOT auto-start if no course levels exist
            if (!hasLevels) {
                console.warn('[DuelLobby] Timer expired but no course levels — aborting auto-start.');
                return;
            }
            // SAFETY: Timer expired. If we are the Host (we didn't receive initialOpponent), we auto-start.
            if (!initialOpponent) {

                const triggerGameStart = async () => {
                    let newBattleId = null;
                    try {
                        const battleRecord = await battlesAPI.create('1v1 duel', opponentRef.current.id);
                        newBattleId = battleRecord?.battle?.id || battleRecord?.id || null;
                        setBattleRecordId(newBattleId);
                    } catch (err) {
                        console.error('[DuelLobby] Failed to create battle record on timeout:', err);
                    }
                    if (lobbyChannelRef.current) {
                        lobbyChannelRef.current.send({
                            type: 'broadcast',
                            event: 'game-start',
                            payload: {
                                targetId: opponentRef.current?.id,
                                startedBy: user.id,
                                battleRecordId: newBattleId
                            }
                        });
                    }
                    setMatchState('starting');
                    setStartCountdown(5);
                };
                triggerGameStart();
            } else {
                // Guest fallback: if host fails or is delayed in sending game-start, guest forces start after 2.5s
                // But ONLY if levels exist
                const fallbackTimeout = setTimeout(() => {
                    if (matchStateRef.current === 'lobby') {
                        setBattleRecordId(Math.floor(Math.random() * 9000) + 1000);
                        setMatchState('starting');
                        setStartCountdown(5);
                    }
                }, 2500);
                return () => clearTimeout(fallbackTimeout);
            }
        }
        return () => clearInterval(interval);
    }, [matchState, timer, opponent, hasLevels]);

    // Launch Countdown (5s -> 0)
    useEffect(() => {
        let interval;
        if (matchState === 'starting' && startCountdown > 0) {
            playCountdownVoice(startCountdown.toString());
            interval = setInterval(() => {
                setStartCountdown((prev) => prev - 1);
            }, 1000);
        } else if (matchState === 'starting' && startCountdown === 0) {
            // Safety: if opponent is gone by now, abort
            if (!opponentRef.current) {
                console.warn('[DuelLobby] Countdown hit 0 but opponent is gone — aborting launch.');
                setMatchState('idle');
                setTimer(0);
                return;
            }
            // Ensure we use the shared battleRecordId or generate a random one if something failed
            const navigateToBattle = () => {
                const finalBattleId = battleRecordId || Math.floor(Math.random() * 9000) + 1000;
                navigate(`/arena-battle/b-${finalBattleId}`, {
                    state: {
                        opponent: opponent.name,
                        opponentId: opponent.id,
                        opponentAvatar: opponent.avatar,
                        opponentRankName: opponent.rankName,
                        opponentRankIcon: opponent.rankIcon,
                        language: selectedLanguage,
                        mode: selectedMode,
                        wager: selectedWager,
                        difficulty: selectedDifficulty,
                        lobbyId: lobbyId,
                        battleRecordId: finalBattleId
                    }
                });
            };
            navigateToBattle();
        }
        return () => clearInterval(interval);
    }, [matchState, startCountdown, navigate, opponent, selectedLanguage, selectedWager, battleRecordId, lobbyId, selectedDifficulty, selectedMode]);

    // --- LOGIC ---

    const handleInvite = async (friend) => {
        if (invitedFriendId === friend.id) return;
        // GUARD: Don't allow inviting more people when opponent already joined
        if (opponent) {
            toast.error('Lobby is full — you already have an opponent.');
            return;
        }
        playClick();
        setInvitedFriendId(friend.id);

        try {
            // 1. Send persistent notification via backend API
            await userAPI.sendDuelInvite(
                friend.id,
                user.name || user.username || 'Someone',
                lobbyId
            );

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
                        senderRankIcon: user.rankIcon,
                        lobbyId: lobbyId,
                        difficulty: selectedDifficulty
                    }
                });
            }

            setSuccessInviteIds(prev => new Set([...prev, friend.id]));
            setInvitedFriendId(null);
            playSuccess();

            // Revert the checkmark back to a plus sign after 10 seconds if they haven't joined
            setTimeout(() => {
                setSuccessInviteIds(prev => {
                    const next = new Set(prev);
                    next.delete(friend.id);
                    return next;
                });
            }, 10000);
        } catch (err) {
            console.error('Failed to send multi invite:', err);
            setInvitedFriendId(null);
        }
    };

    const handleReadyClick = () => {
        if (!opponent) return;
        if (!hasLevels) return; // Block ready if no levels
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

    // Auto-Start when BOTH are ready
    useEffect(() => {
        if (matchState === 'lobby' && isUserReady && isOpponentReady && !initialOpponent) {
            // ONLY the Host triggers this when both are ready
            const triggerGameStart = async () => {
                let newBattleId = null;
                try {
                    const battleRecord = await battlesAPI.create('1v1 duel', opponent?.id);
                    newBattleId = battleRecord?.battle?.id || battleRecord?.id || null;
                } catch (err) {
                    console.error('[DuelLobby] Failed to create battle record:', err);
                }

                // If API creation failed, generate the fallback ID on the Host so BOTH players share the exactly same ID
                if (!newBattleId) {
                    newBattleId = Math.floor(Math.random() * 9000) + 1000;
                }
                setBattleRecordId(newBattleId);

                // Broadcast game-start to the opponent so both start the countdown together
                if (lobbyChannelRef.current) {
                    lobbyChannelRef.current.send({
                        type: 'broadcast',
                        event: 'game-start',
                        payload: {
                            targetId: opponent?.id,
                            startedBy: user.id,
                            battleRecordId: newBattleId
                        }
                    });
                }
                setMatchState('starting');
                setStartCountdown(5);
            };
            
            triggerGameStart();
        }
    }, [matchState, isUserReady, isOpponentReady, initialOpponent, opponent, user]);

    // --- SETTINGS SYNC ---
    const handleSettingChange = (settingType, value) => {
        playSelect();
        if (settingType === 'language') setSelectedLanguage(value);
        if (settingType === 'difficulty') setSelectedDifficulty(value);
        if (settingType === 'mode') setSelectedMode(value);
        if (settingType === 'wager') setSelectedWager(value);

        // Broadcast change immediately if we are the HOST (host = !initialOpponent)
        // This ensures settings sync to guest both before and after they join
        if (lobbyChannelRef.current && !initialOpponent) {
            lobbyChannelRef.current.send({
                type: 'broadcast',
                event: 'sync-settings',
                payload: {
                    targetId: opponentRef.current?.id || '*',
                    language: settingType === 'language' ? value : (selectedLanguageRef.current || (courses.length > 0 ? courses[0].name : '')),
                    difficulty: settingType === 'difficulty' ? value : selectedDifficultyRef.current,
                    mode: settingType === 'mode' ? value : selectedModeRef.current,
                    wager: settingType === 'wager' ? value : selectedWagerRef.current
                }
            });
        }
    };

    // --- AUDIO CONTROL ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isOpen && !isMuted && matchState !== 'starting') {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    }, [isOpen, isMuted, matchState]);

    useEffect(() => {
        localStorage.setItem('lobbyMusic_muted', isMuted);
    }, [isMuted]);

    // --- RENDER ---

    // --- COMPUTED ARRAYS ---
    // A friend is online if Supabase Presence has their ID OR their last heartbeat was within 3 minutes
    const isOnline = (f) => {
        const inPresence = onlineUserIds.has(String(f.id)) || onlineUserIds.has(f.id);
        if (inPresence) return true;
        if (f.lastActiveAt) {
            const lastActive = new Date(f.lastActiveAt).getTime();
            const now = Date.now();
            const diff = now - lastActive;
            return diff < 180000; // 3 minutes
        }

        return false;
    };
    const onlineFriends = friends.filter(isOnline);
    const offlineFriends = friends.filter(f => !isOnline(f));
    const lobbyPlayersOnly = onlineUsers.filter(u => !friends.some(f => f.id === u.id));

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
                            <button
                                onClick={() => {
                                    if (matchState === 'lobby' || matchState === 'starting') {
                                        setShowExitModal(true);
                                    } else {
                                        resetLobbyState();
                                        onBack();
                                    }
                                }}
                                className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-600 hover:border-red-500 hover:bg-red-500/20 transition-all duration-300 group z-20 relative"
                            >
                                <X className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-transform duration-300 group-hover:rotate-90" />
                            </button>

                            {/* Center: Title info & Timer */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                {matchState === 'lobby' || matchState === 'starting' ? (
                                    <div className="flex flex-col items-center animate-in fade-in duration-300">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                            {matchState === 'starting' ? 'Game Starting' : !hasLevels ? 'Waiting For Levels' : 'Auto-Start In'}
                                        </span>
                                        {!hasLevels && matchState !== 'starting' ? (
                                            <span className="text-lg font-black text-rose-500 uppercase tracking-wider animate-pulse">
                                                PAUSED
                                            </span>
                                        ) : (
                                            <span className={`text-2xl font-black tracking-wider ${matchState === 'starting' ? (startCountdown < 10 ? 'text-rose-500' : 'text-slate-200') : (timer < 10 ? 'text-rose-500' : 'text-slate-200')}`}>
                                                {formatTime(matchState === 'starting' ? startCountdown : timer)}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Private Duel</h1>
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
                                {!!opponent && (
                                    <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                                        <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">🔒 Settings Locked</span>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Language</label>
                                        <div className="relative group">
                                            {!opponent && <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {opponent ? (
                                                <div className="w-full bg-[#0B1221] border border-white/10 text-white/50 font-bold text-sm px-4 py-3 rounded-xl cursor-not-allowed">
                                                    {selectedLanguage || 'N/A'}
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedLanguage}
                                                    onChange={(e) => handleSettingChange('language', e.target.value)}
                                                    className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-xl appearance-none relative z-10 focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                                                >
                                                    {courses.length > 0 ? (
                                                        courses.map((c) => (
                                                            <option key={c.id} value={c.name}>{c.name}</option>
                                                        ))
                                                    ) : (
                                                        <option disabled value="">No Languages Found</option>
                                                    )}
                                                </select>
                                            )}
                                            {!opponent && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-20 pointer-events-none" />}
                                        </div>
                                    </div>

                                    {/* DIFFICULTY SETTING */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Difficulty</label>
                                        <div className="relative group">
                                            {!opponent && <div className="absolute inset-0 bg-rose-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {opponent ? (
                                                <div className="w-full bg-[#0B1221] border border-white/10 text-white/50 font-bold text-sm px-4 py-3 rounded-xl cursor-not-allowed">
                                                    {selectedDifficulty}
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedDifficulty}
                                                    onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                                                    className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-xl appearance-none relative z-10 focus:border-rose-500 focus:outline-none transition-colors cursor-pointer"
                                                >
                                                    <option value="Easy">Easy</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="Hard">Hard</option>
                                                </select>
                                            )}
                                            {!opponent && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-20 pointer-events-none" />}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode</label>
                                        <div className="relative group">
                                            {!opponent && <div className="absolute inset-0 bg-violet-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {opponent ? (
                                                <div className="w-full bg-[#0B1221] border border-white/10 text-white/50 font-bold text-sm px-4 py-3 rounded-xl cursor-not-allowed">
                                                    {selectedMode}
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedMode}
                                                    onChange={(e) => handleSettingChange('mode', e.target.value)}
                                                    className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-xl appearance-none relative z-10 focus:border-violet-500 focus:outline-none transition-colors cursor-pointer"
                                                >
                                                    <option>Puzzle Blocks</option>
                                                    <option>Blocks</option>
                                                    <option>Hardcode</option>
                                                </select>
                                            )}
                                            {!opponent && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-20 pointer-events-none" />}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wager (EXP)</label>
                                        <div className="relative group">
                                            {!opponent && <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            {opponent ? (
                                                <div className="w-full bg-[#0B1221] border border-white/10 text-white/50 font-bold text-sm px-4 py-3 rounded-xl cursor-not-allowed">
                                                    {selectedWager} EXP
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedWager}
                                                    onChange={(e) => handleSettingChange('wager', e.target.value)}
                                                    className="w-full bg-[#0B1221] border border-white/10 text-white font-bold text-sm px-4 py-3 rounded-xl appearance-none relative z-10 focus:border-amber-500 focus:outline-none transition-colors cursor-pointer"
                                                >
                                                    <option value="50">50 EXP</option>
                                                    <option value="100">100 EXP</option>
                                                    <option value="250">250 EXP</option>
                                                    <option value="500">500 EXP</option>
                                                </select>
                                            )}
                                            {!opponent && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-20 pointer-events-none" />}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Time Limit</p>
                                        <p className="text-xl font-black text-white">10:00</p>
                                    </div>
                                    {!hasLevels && !isCheckingLevels && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 font-bold text-xs uppercase text-center animate-pulse mt-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                            No course levels generated for these settings
                                        </div>
                                    )}
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
                                                        {user.avatar ? (
                                                            <img src={user.avatar} className="w-full h-full object-cover rounded-lg" alt="Avatar" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-800">
                                                                <span className="text-4xl font-black text-cyan-400 select-none">
                                                                    {user.name?.charAt(0).toUpperCase() || 'U'}
                                                                </span>
                                                            </div>
                                                        )}
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
                                                                {opponent.avatar ? (
                                                                    <img src={opponent.avatar} className="w-full h-full object-cover rounded-lg" alt="Avatar" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-800">
                                                                        <span className="text-4xl font-black text-rose-400 select-none">
                                                                            {opponent.name?.charAt(0).toUpperCase() || 'O'}
                                                                        </span>
                                                                    </div>
                                                                )}
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
                                <div className="mb-4">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3 mb-2">
                                        <span>Invite Friends</span>
                                        <button
                                            onClick={() => { playClick(); setModalMode('friend'); setShowAddFriendModal(true); }}
                                            className="p-2 bg-white/5 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/50 rounded-lg transition-all group/add"
                                        >
                                            <UserPlus className="w-4 h-4 text-slate-400 group-hover/add:text-cyan-400" />
                                        </button>
                                    </h3>
                                    <span className="text-[10px] px-2 py-1 bg-white/10 rounded text-slate-500 font-bold">{onlineFriends.length + lobbyPlayersOnly.length} Online</span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2 custom-scrollbar">
                                    {/* ONLINE FRIENDS */}
                                    {onlineFriends.length > 0 && (
                                        <>
                                            <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest px-1 pt-1 pb-1">Friends</p>
                                            {onlineFriends.map((friend) => (
                                                <button
                                                    key={friend.id}
                                                    onClick={() => handleInvite(friend)}
                                                    disabled={!!opponent}
                                                    className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 group text-left ${!!opponent ? 'bg-slate-800/80 border-slate-700 opacity-50 cursor-not-allowed' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
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
                                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a120b] bg-emerald-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{friend.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <img src={friend.rankIcon} className="w-8 h-8 object-contain drop-shadow-sm" alt="Rank" />
                                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest truncate">{friend.rankName}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg ${opponent?.id == friend.id || successInviteIds.has(friend.id)
                                                        ? 'bg-blue-600/50 cursor-default'
                                                        : invitedFriendId === friend.id
                                                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                                            : `bg-rose-500 text-white shadow-rose-900/20 ${!!opponent ? 'opacity-50' : 'hover:bg-rose-400 hover:scale-110 active:scale-95'}`
                                                        }`}>
                                                        {opponent?.id === friend.id || successInviteIds.has(friend.id) ? (
                                                            <Check className="w-5 h-5 text-blue-200" />
                                                        ) : invitedFriendId === friend.id ? (
                                                            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                                        ) : (
                                                            <Plus className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {/* LOBBY PLAYERS (non-friends currently in the duel lobby) */}
                                    {lobbyPlayersOnly.length > 0 && (
                                        <>
                                            <div className="border-t border-white/5 mt-2 pt-2" />
                                            <p className="text-[10px] font-bold text-cyan-500/70 uppercase tracking-widest px-1 pb-1">In Lobby</p>
                                            {lobbyPlayersOnly.map((lobbyPlayer) => (
                                                <button
                                                    key={lobbyPlayer.id}
                                                    onClick={() => handleInvite({ id: lobbyPlayer.id, name: lobbyPlayer.name, avatar: lobbyPlayer.avatar, rankName: lobbyPlayer.rankName, rankIcon: lobbyPlayer.rankIcon, status: 'online' })}
                                                    disabled={!!opponent}
                                                    className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 group text-left ${!!opponent ? 'bg-slate-800/80 border-slate-700 opacity-50 cursor-not-allowed' : 'bg-cyan-500/5 border-cyan-500/10 hover:bg-cyan-500/10 hover:border-cyan-500/20'}`}
                                                >
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden border border-white/10">
                                                            {lobbyPlayer.avatar ? (
                                                                <img src={lobbyPlayer.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                                    <User className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a120b] bg-emerald-500 animate-pulse" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{lobbyPlayer.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {lobbyPlayer.rankIcon && <img src={lobbyPlayer.rankIcon} className="w-8 h-8 object-contain drop-shadow-sm" alt="Rank" />}
                                                            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest truncate">{lobbyPlayer.rankName || 'In Lobby'}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg ${opponent?.id == lobbyPlayer.id || successInviteIds.has(lobbyPlayer.id)
                                                        ? 'bg-blue-600/50 cursor-default'
                                                        : invitedFriendId === lobbyPlayer.id
                                                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                                            : `bg-cyan-500 text-white shadow-cyan-900/20 ${!!opponent ? 'opacity-50' : 'hover:bg-cyan-400 hover:scale-110 active:scale-95'}`
                                                        }`}>
                                                        {opponent?.id === lobbyPlayer.id || successInviteIds.has(lobbyPlayer.id) ? (
                                                            <Check className="w-5 h-5 text-blue-200" />
                                                        ) : invitedFriendId === lobbyPlayer.id ? (
                                                            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                                        ) : (
                                                            <Swords className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {/* OFFLINE FRIENDS */}
                                    {offlineFriends.length > 0 && (
                                        <>
                                            <div className="border-t border-white/5 mt-2 pt-2" />
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1 pb-1">Offline</p>
                                            {offlineFriends.map((friend) => (
                                                <div
                                                    key={friend.id}
                                                    className="w-full p-3 rounded-xl flex items-center gap-3 opacity-40"
                                                >
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden border border-white/10 grayscale">
                                                            {friend.avatar ? (
                                                                <img src={friend.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                                    <User className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a120b] bg-slate-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-400 truncate">{friend.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <img src={friend.rankIcon} className="w-8 h-8 object-contain opacity-50" alt="Rank" />
                                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">{friend.rankName}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Empty state if nobody online and no friends */}
                                    {friends.length === 0 && onlineUsers.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <User className="w-10 h-10 text-slate-700 mb-3" />
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No friends yet</p>
                                            <p className="text-slate-600 text-[10px] mt-1">Add friends to invite them to duels</p>
                                        </div>
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
                                disabled={isUserReady || !opponent || matchState === 'starting' || !hasLevels || isCheckingLevels}
                                className={`h-14 px-16 rounded-full border-2 flex items-center justify-center gap-2 transition-all ${isUserReady
                                    ? 'bg-emerald-600 border-emerald-400 text-white cursor-default'
                                    : opponent
                                        ? (!hasLevels || isCheckingLevels)
                                            ? 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed opacity-50'
                                            : 'bg-gradient-to-b from-amber-400 to-orange-500 border-amber-300 text-amber-950 font-black hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.6)] cursor-pointer'
                                        : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                <Swords className={`w-6 h-6 ${isUserReady || matchState === 'starting' || !hasLevels ? '' : 'animate-pulse'}`} />
                                <span className="font-black uppercase tracking-widest text-lg">
                                    {matchState === 'starting' ? 'STARTING...' : isUserReady ? 'READY!' : !hasLevels ? 'LEVELS MISSING' : isCheckingLevels ? 'CHECKING...' : opponent ? 'CLICK TO READY' : 'WAITING FOR PLAYER'}
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
                    {showAddFriendModal && (
                        <AddFriendModal isOpen={showAddFriendModal} onClose={() => setShowAddFriendModal(false)} mode={modalMode} />
                    )}

                    {/* Exit Confirmation Modal */}
                    <AnimatePresence>
                        {showExitModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.9, y: 20 }}
                                    transition={{ type: 'spring', bounce: 0.35 }}
                                    className="bg-[#0f0e17] border border-red-500/50 p-1 max-w-md w-full mx-4 relative"
                                >
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500 z-20" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500 z-20" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500 z-20" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500 z-20" />
                                    <div className="bg-[#0b0a10] p-8 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                                        <div className="relative z-10 flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-5 ring-1 ring-red-500/40 animate-pulse">
                                                <X className="w-8 h-8 text-red-500" />
                                            </div>
                                            <h2 className="text-2xl font-black text-red-400 uppercase tracking-widest mb-2">Abandon Duel?</h2>
                                            <div className="h-px w-20 bg-red-500/40 mb-4" />
                                            <p className="text-slate-400 text-sm font-mono mb-8 leading-relaxed">
                                                Leaving will cancel the match for both players.<br />
                                                Your opponent will be notified you left.
                                            </p>
                                            <div className="grid grid-cols-2 gap-4 w-full">
                                                <button
                                                    onClick={() => setShowExitModal(false)}
                                                    className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-black text-xs uppercase tracking-widest transition-all rounded-lg"
                                                >
                                                    Continue
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        // Async fire-and-forget channel cleanup to prevent UI blocking
                                                        if (lobbyChannelRef.current) {
                                                            const ch = lobbyChannelRef.current;
                                                            lobbyChannelRef.current = null;
                                                            try {
                                                                const leavePayload = {
                                                                    type: 'broadcast',
                                                                    event: 'player-leave',
                                                                    payload: { playerId: user?.id }
                                                                };
                                                                // Send leave broadcast multiple times to ensure delivery
                                                                ch.send(leavePayload).catch(() => {});
                                                                setTimeout(() => ch.send(leavePayload).catch(() => {}), 300);
                                                                setTimeout(() => ch.send(leavePayload).catch(() => {}), 800);
                                                                ch.untrack().catch(() => {});
                                                                setTimeout(() => supabase.removeChannel(ch), 1500);
                                                            } catch (e) { /* best effort */ }
                                                        }
                                                        resetLobbyState();
                                                        onBack();
                                                    }}
                                                    className="py-3 bg-red-600/20 hover:bg-red-600 border border-red-500 text-red-400 hover:text-white font-black text-xs uppercase tracking-widest transition-all duration-300 rounded-lg"
                                                >
                                                    Leave Lobby
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
        if (!searchQuery.trim()) return;
        const query = searchQuery.trim();

        setSearching(true);
        setSearchError('');
        setFoundUser(null);


        const startTime = Date.now();

        try {
            // Search via backend API (uses service-role client, bypasses RLS)
            const result = await userAPI.searchUser(query);

            const duration = Date.now() - startTime;

            if (!result || !result.user) {
                setSearchError('No other player found with that name or ID');
                return;
            }

            playSuccess();
            setFoundUser(result.user);
        } catch (err) {
            console.error('[Search] Error:', err);
            if (err.message && err.message.includes('No user found')) {
                setSearchError('No other player found with that name or ID');
            } else {
                setSearchError('Search failed. Try again.');
            }
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
            // Send friend request via backend API (bypasses RLS)
            const result = await userAPI.sendFriendRequest(
                foundUser.id,
                user.name || user.username || 'Someone',
                mode,
                null // lobbyId not needed for friend mode
            );

            if (result.status === 'already_friends') {
                setAddStatus('already_friends');
            } else if (result.status === 'already_sent') {
                setAddStatus('already_sent');
            } else if (result.status === 'sent') {
                // Broadcast the invite for real-time if it's a duel invite
                if (mode !== 'friend' && lobbyChannelRef?.current) {
                    lobbyChannelRef.current.send({
                        type: 'broadcast',
                        event: 'duel-invite',
                        payload: {
                            targetId: foundUser.id,
                            senderId: user.id,
                            senderName: user.name,
                            senderAvatar: user.avatar,
                            senderRankName: user.rankName,
                            senderRankIcon: user.rankIcon,
                            lobbyId: lobbyId,
                            difficulty: selectedDifficulty
                        }
                    });
                }
                playSuccess();
                setAddStatus('sent');
            }
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

    // Removed local rank determination, using getRankFromExp from rankSystem.js

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
                                    {foundUser.avatar_url ? (
                                        <img
                                            src={foundUser.avatar_url}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                            <User className="w-8 h-8 text-slate-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-black text-lg uppercase tracking-wider truncate">{foundUser.username}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <img src={getRankFromExp(foundUser.xp || 0).icon} alt="Rank" className="w-5 h-5 object-contain" />
                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{getRankFromExp(foundUser.xp || 0).name}</span>
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
