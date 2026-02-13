import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, Users, Zap, Shield, Swords, UserPlus, Globe, Award, Medal, Volume2, VolumeX, User } from 'lucide-react';
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

import { RANKS } from '../../utils/rankSystem';

const MultiplayerLobbyModal = ({ isOpen, onClose, onBack }) => {
    const navigate = useNavigate();

    // Core User Data
    const { user } = useUser();

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
        id: 1,
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

    // Language & Wager Selection
    const [selectedMode, setSelectedMode] = useState('Ranked');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [selectedWager, setSelectedWager] = useState(null);
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [showWagerDropdown, setShowWagerDropdown] = useState(false);

    const languages = ['Python', 'C#', 'C++', 'JavaScript', 'PHP', 'MySQL'];
    const wagerOptions = [50, 100, 200, 500, 1000];

    // Modals & Notifications
    const [showExitModal, setShowExitModal] = useState(false);
    const [inviteError, setInviteError] = useState(null);
    const [startCount, setStartCount] = useState(5);
    const [isMuted, setIsMuted] = useState(() => {
        // Load mute state from localStorage
        const saved = localStorage.getItem('lobbyMusic_muted');
        return saved === 'true';
    });
    const audioRef = React.useRef(null);
    const { playClick, playSuccess, playCancel, playSelect, playCountdownVoice } = useSound();

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
            // Search failed or infinite search? User said "1minute countdown"... usually retries or asks.
            // For now, let's keep searching but maybe reset timer? Or stop? 
            // User: "when finding match it will set the time to 1minute countdown... then after showing... change to Ready... time will restart to 1minute"
            // If search ends implies we didn't find enough? Let's just reset for now or stay 0.
        }
    }, [matchState, timer]);

    // Auto-Transition: Ready Check Timeout
    useEffect(() => {
        if (matchState === 'ready_check' && timer === 0) {
            handleReadyCheckComplete(); // Determine if we start or restart search
        }
    }, [matchState, timer]);

    // Auto-Transition: Game Start
    useEffect(() => {
        if (matchState === 'starting' && timer === 0) {
            const opponentData = players.filter(p => p.id !== 1);
            navigate('/grand-arena/multiplayer', {
                state: {
                    opponents: opponentData,
                    wager: selectedWager?.toString() || '0',
                    language: selectedLanguage || 'Python'
                }
            });
        }
    }, [matchState, timer, navigate, players, selectedWager, selectedLanguage]);

    // Lobby music control
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isOpen && !isMuted && matchState !== 'starting') {
            audio.play().catch(err => console.log('Lobby music play failed:', err));
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


    // --- MATCHMAKING SIMULATION ---

    // 1. Simulate Finding Players (during 'searching')
    useEffect(() => {
        if (matchState === 'searching') {
            const interval = setInterval(() => {
                setPlayers(prev => {
                    // Randomly add players until we hit random target (3-5)
                    const targetPlayers = 5; // Simulating seeking full lobby
                    if (prev.length >= targetPlayers) return prev;

                    if (Math.random() > 0.6) {
                        const newId = prev.length + 100;
                        const names = ['ixhia', 'Yunus Camba', 'Azzurra Braz-37', 'VoidWalker'];
                        const randomRankId = Math.floor(Math.random() * 12) + 1;
                        const randomHeroImage = [hero2Static, hero3Static, hero4Static][Math.floor(Math.random() * 3)];

                        return [...prev, {
                            id: newId,
                            name: names[prev.length - 1] || `Player ${prev.length}`,
                            level: Math.floor(Math.random() * 50),
                            status: 'pending',
                            isReady: false,
                            avatar: heroAsset,
                            heroImage: randomHeroImage, // Assign a static image
                            rankId: randomRankId,
                            achievements: Math.floor(Math.random() * 50) + 10,
                            ms: '45ms',
                            logo: Math.random() > 0.5 ? ccsLogo : jrmsuLogo
                        }];
                    }
                    return prev;
                });
            }, 1500);

            return () => clearInterval(interval);
        }
    }, [matchState]);

    // 2. Trigger Ready Check when players found
    useEffect(() => {
        if (matchState === 'searching' && players.length >= 3) {
            // Wait a moment then trigger ready check
            // Logic: "showing the match players whether it shows 3 or 4 or 5... then change to Ready"
            // Let's settle at 4 players for variation or wait for full 5? 
            // Let's say if we have >= 3 and time is running out or just random chance to stop searching better?
            // For robustness: lets wait until 5 OR if user cancels. 
            // Actually user said "whether it shows 3 or 4 or 5". checking length change.
            if (players.length === 5) {
                startReadyPhase();
            }
        }
    }, [matchState, players.length]);

    const startReadyPhase = () => {
        setMatchState('ready_check');
        setTimer(60); // Restart to 1 minute
        // Reset local user ready status to false so they have to click it? 
        // "must click the ready button... if they click... color their entry" -> implies manual action.
        setPlayers(prev => prev.map(p => ({ ...p, isReady: false })));
    };


    // 3. Simulate Opponents Clicking Ready (during 'ready_check')
    useEffect(() => {
        if (matchState === 'ready_check') {
            const interval = setInterval(() => {
                setPlayers(prev => {
                    return prev.map(p => {
                        if (p.id === 1) return p; // Don't auto-ready current user
                        if (p.isReady) return p;

                        // Random chance to ready up
                        if (Math.random() > 0.8) {
                            return { ...p, isReady: true };
                        }
                        return p;
                    });
                });
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [matchState]);

    // 4. Auto-Start if ALL ready
    useEffect(() => {
        if (matchState === 'ready_check') {
            const allReady = players.every(p => p.isReady);
            if (allReady && players.length >= 3) {
                startGameCountdown();
            }
        }
    }, [matchState, players]);


    // --- HANDLERS ---

    const handleFindMatch = () => {
        playClick();
        if (matchState === 'idle') {
            setMatchState('searching');
            setTimer(60); // Set to 1 minute
            // Keep invited players - don't reset
            // setPlayers([{ ...current User, isReady: true }]); // OLD: This removed invited players
        } else if (matchState === 'searching') {
            // Cancel Search
            setMatchState('idle');
            setTimer(0);
            // Keep current players when canceling search
        }
    };

    const handleReadyClick = () => {
        playSuccess();
        if (matchState === 'ready_check') {
            setPlayers(prev => prev.map(p => p.id === 1 ? { ...p, isReady: true } : p));
        }
    };

    const handleInvite = (friend) => {
        if (friend.rankId === currentUser.rankId) {
            // Allow invite (simulation)
            // In a real app we'd send an invite. Here maybe add them to lobby?
            // "you can invite... same rank... if not show message"
            setInviteError(null);
            // Simulate adding friend to lobby
            if (!players.find(p => p.id === friend.id) && matchState === 'idle') {
                setPlayers(prev => [...prev, {
                    ...friend,
                    isReady: true, // Auto ready if manually invited? or not? Assuming ready for lobby.
                    ms: '40ms'
                }]);
            }
        } else {
            setInviteError(`Only players of rank "${getRank(currentUser.rankId).name}" can be invited.`);
            setTimeout(() => setInviteError(null), 3000);
        }
    };

    const handleReadyCheckComplete = () => {
        // "if 1min is done... search again... only if opponent is one remaining"
        // "if 4 or 5 then 2 or 1 not ready... continue remaining as long as you and 2 other are ready"

        const readyCount = players.filter(p => p.isReady).length;
        const totalPlayers = players.length;

        // Condition: You + 2 others = 3 minimum ready
        if (readyCount >= 3) {
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

    const handleBackClick = () => {
        playCancel();
        if (matchState !== 'idle') {
            setShowExitModal(true);
        } else {
            onBack();
        }
    };

    // --- RENDER HELPERS ---

    const friends = [
        // No friends yet for new accounts
    ];

    const offlineFriends = [
        // No offline friends for new accounts
    ];

    const getRank = (id) => RANKS.find(r => r.id === id) || RANKS[0];
    const slots = [0, 1, 2, 3, 4];

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

                            {/* CENTER: BANNERS */}
                            <div className="flex-1 flex flex-col items-center justify-center relative">

                                <div className="flex items-start justify-center gap-4 w-full px-8">
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
                                        const isGrey = matchState === 'ready_check' && !player.isReady;

                                        return (
                                            <div key={i} className="relative group">
                                                {/* Banner Shape */}
                                                <div
                                                    className={`w-48 h-[600px] relative flex flex-col transition-all duration-300 ${player
                                                        ? (isGrey ? 'bg-slate-800 border-t-4 border-slate-600 grayscale' : 'bg-gradient-to-b from-cyan-900/80 to-blue-900/80 border-t-4 border-cyan-400')
                                                        : 'bg-slate-800/40 border-t-4 border-slate-600/40'
                                                        }`}
                                                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)' }}
                                                >
                                                    {player ? (
                                                        <div className={`flex flex-col items-center pt-8 px-4 h-full relative z-10 ${isGrey ? 'opacity-50' : 'opacity-100'}`}>
                                                            {/* Hero Image - Full Body */}
                                                            <div className="absolute inset-0 z-0 pointer-events-none flex items-end justify-center overflow-hidden">
                                                                <motion.img
                                                                    initial={{ scale: 1.0, y: 50 }}
                                                                    animate={{
                                                                        scale: isGrey ? 0.9 : 1.05,
                                                                        y: isGrey ? 20 : 70
                                                                    }}
                                                                    src={player.heroImage || player.avatar}
                                                                    className={`w-full h-full object-contain transition-all duration-700 ${isGrey ? 'brightness-50 grayscale' : 'drop-shadow-[0_20px_50px_rgba(34,211,238,0.4)] brightness-110'}`}
                                                                    alt="Hero"
                                                                />
                                                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                                                            </div>


                                                            {/* User Info Overlay */}
                                                            <div className="relative z-30 flex flex-col items-center pt-[72px] pointer-events-none w-full">
                                                                {/* Avatar Frame */}
                                                                <div className={`w-24 h-24 rounded-xl border-2 p-0.5 relative mb-3 transition-all duration-500 ${isGrey ? 'border-slate-500 grayscale' : 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)] scale-110'}`}>
                                                                    <img src={player.avatar} className="w-full h-full object-cover rounded-lg" alt="" />
                                                                    <div className="absolute -bottom-2.5 -right-2.5 bg-slate-900 rounded-full p-0.5 border border-slate-700">
                                                                        <img src={displayRankIcon} className="w-6 h-6 rounded-full object-contain" alt="Rank" />
                                                                    </div>
                                                                </div>

                                                                <h3 className={`text-sm font-black italic uppercase tracking-tighter mb-1 truncate w-full text-center drop-shadow-[0_4px_12px_rgba(0,0,0,1)] ${isGrey ? 'text-slate-400' : 'text-white scale-110'}`}>{player.name}</h3>
                                                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] shadow-black drop-shadow-sm ${isGrey ? 'text-slate-500' : 'text-cyan-400'}`}>{displayRankName}</span>
                                                            </div>


                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex flex-col items-center justify-center relative opacity-30">
                                                            <div className="w-20 h-20 border-2 border-white/20 flex items-center justify-center text-4xl font-bold text-white/20 mb-4">?</div>
                                                            <p className="text-xs text-center px-4">Waiting for Player...</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* BOTTOM BAR: ACTION BUTTON WITH DROPDOWNS */}
                                <div className="mt-12 flex items-center justify-center gap-6 relative">
                                    {inviteError && (
                                        <div className="absolute -top-16 bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-bounce">
                                            {inviteError}
                                        </div>
                                    )}

                                    {/* Language Dropdown */}
                                    {matchState === 'idle' && (
                                        <div className="relative">
                                            <button
                                                onClick={() => {
                                                    setShowLanguageDropdown(!showLanguageDropdown);
                                                    setShowWagerDropdown(false);
                                                }}
                                                className="h-14 px-6 rounded-xl bg-slate-800 border-2 border-slate-700 hover:border-cyan-500 text-white font-bold transition-all flex items-center gap-2"
                                            >
                                                <span className="text-sm uppercase tracking-wider">
                                                    {selectedLanguage || 'Select Language'}
                                                </span>
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            {showLanguageDropdown && (
                                                <div className="absolute bottom-full mb-2 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50">
                                                    {languages.map((lang) => (
                                                        <button
                                                            key={lang}
                                                            onClick={() => {
                                                                playSelect();
                                                                setSelectedLanguage(lang);
                                                                setShowLanguageDropdown(false);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-cyan-500/20 transition-colors border-b border-slate-800 last:border-0"
                                                        >
                                                            {lang}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Wager Dropdown */}
                                    {matchState === 'idle' && (
                                        <div className="relative">
                                            <button
                                                onClick={() => {
                                                    setShowWagerDropdown(!showWagerDropdown);
                                                    setShowLanguageDropdown(false);
                                                }}
                                                className="h-14 px-6 rounded-xl bg-slate-800 border-2 border-slate-700 hover:border-amber-500 text-white font-bold transition-all flex items-center gap-2"
                                            >
                                                <span className="text-sm uppercase tracking-wider">
                                                    {selectedWager ? `${selectedWager} EXP` : 'Select Wager'}
                                                </span>
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            {showWagerDropdown && (
                                                <div className="absolute bottom-full mb-2 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50">
                                                    {wagerOptions.map((amount) => (
                                                        <button
                                                            key={amount}
                                                            onClick={() => {
                                                                playSelect();
                                                                setSelectedWager(amount);
                                                                setShowWagerDropdown(false);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-amber-500/20 transition-colors border-b border-slate-800 last:border-0"
                                                        >
                                                            {amount} EXP
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {matchState === 'ready_check' ? (
                                        <button
                                            onClick={handleReadyClick}
                                            disabled={players.find(p => p.id === currentUser.id)?.isReady}
                                            className={`h-14 px-16 rounded-full border-2 flex items-center justify-center gap-2 transition-all ${players.find(p => p.id === currentUser.id)?.isReady
                                                ? 'bg-emerald-600 border-emerald-400 text-white cursor-default'
                                                : 'bg-gradient-to-b from-amber-400 to-orange-500 border-amber-300 text-ammber-950 font-black hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                                                }`}
                                        >
                                            <span className="font-black uppercase tracking-widest text-lg">
                                                {players.find(p => p.id === currentUser.id)?.isReady ? 'READY!' : 'CLICK TO READY'}
                                            </span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleFindMatch}
                                            disabled={!selectedLanguage || !selectedWager || matchState === 'searching'}
                                            className={`h-14 px-16 rounded-full border-2 flex items-center justify-center gap-2 group transition-transform ${matchState === 'searching'
                                                ? 'bg-slate-700 border-slate-500 text-slate-300'
                                                : (!selectedLanguage || !selectedWager)
                                                    ? 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                                                    : 'bg-gradient-to-b from-yellow-300 to-amber-500 border-yellow-200/50 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-black hover:scale-105'
                                                }`}
                                        >
                                            <span className="font-black uppercase tracking-widest text-lg drop-shadow-sm">
                                                {matchState === 'searching' ? 'Searching...' : 'Find Match'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT SIDEBAR: FRIENDS LIST */}
                            <div className="w-48 bg-gradient-to-l from-slate-900/80 to-transparent p-3 overflow-y-auto pt-6">
                                {/* Navigation Tabs */}
                                <div className="flex items-center justify-center mb-3 text-slate-500">
                                    <div className="flex flex-col items-center gap-1 text-cyan-400">
                                        <Users className="w-5 h-5" />
                                        <div className="w-1 h-1 rounded-full bg-cyan-400" />
                                    </div>
                                </div>

                                {/* Friends Section */}
                                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">
                                    <span>Friends</span>
                                    <ChevronDown className="w-3 h-3" />
                                </div>

                                <div className="space-y-2 mb-3">
                                    {friends.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-4 text-center">
                                            <User className="w-6 h-6 text-slate-700 mb-1" />
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">No friends online</p>
                                        </div>
                                    ) : (
                                        friends.map(friend => {
                                            const rank = getRank(friend.rankId);
                                            return (
                                                <div key={friend.id} className="p-1.5 rounded-lg hover:bg-white/5 flex items-center gap-2 group transition-colors cursor-pointer">
                                                    <div className="relative shrink-0">
                                                        <img src={friend.avatar} className="w-8 h-8 rounded border border-white/20" alt="" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-xs font-bold text-slate-200 truncate block">{friend.name}</span>
                                                        <span className="text-[9px] text-amber-500">{rank.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleInvite(friend)}
                                                        className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors shrink-0"
                                                    >
                                                        <UserPlus className="w-3 h-3" />
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

                                <div className="space-y-2 opacity-60">
                                    {offlineFriends.map(friend => {
                                        const rank = getRank(friend.rankId);
                                        return (
                                            <div key={friend.id} className="p-1.5 rounded-lg flex items-center gap-2">
                                                <div className="relative grayscale shrink-0">
                                                    <img src={friend.avatar} className="w-8 h-8 rounded border border-white/10" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-bold text-slate-400 truncate block">{friend.name}</span>
                                                    <span className="text-[9px] text-slate-600">{rank.name}</span>
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
