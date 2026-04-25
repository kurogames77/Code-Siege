import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Crown, Medal, Search, ChevronUp, ChevronDown, Shield, Loader2, Swords, Award, User } from 'lucide-react';
import heroAsset from '../../assets/hero1.png';
import leaderboardIcon from '../../assets/leaderboard.png';
import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import { getRankIcon, getRankName } from '../../utils/rankSystem';
import RankLegendModal from './RankLegendModal';
import { useTheme } from '../../contexts/ThemeContext'; // Import ThemeContext
import { leaderboardAPI, userAPI } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LeaderboardModal = ({ isOpen, onClose }) => {
    const { playClick, playCancel } = useSound();
    const { user } = useUser();
    const { currentTheme } = useTheme(); // Use ThemeContext
    const [timeframe, setTimeframe] = useState('weekly');
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRankLegend, setShowRankLegend] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [isPlayerViewerOpen, setIsPlayerViewerOpen] = useState(false);
    const [isPlayerLoading, setIsPlayerLoading] = useState(false);

    // Fetch leaderboard data
    useEffect(() => {
        if (!isOpen) return;

        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);
            try {
                let data;
                if (timeframe === 'weekly') {
                    data = await leaderboardAPI.getWeekly(50);
                } else {
                    data = await leaderboardAPI.getAll(50);
                }

                setLeaderboard(data.leaderboard || []);
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
                setError('Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [isOpen, timeframe]);

    // Handler to view a player's full profile
    const handleViewPlayerProfile = async (playerId) => {
        if (!playerId || playerId === user?.id) return; // Don't open for self
        setIsPlayerLoading(true);
        setIsPlayerViewerOpen(true);
        try {
            const data = await userAPI.getUserProfile(playerId);
            setSelectedPlayer(data?.user || data?.profile || data);
        } catch (error) {
            console.error('Failed to load player profile', error);
            setIsPlayerViewerOpen(false);
        } finally {
            setIsPlayerLoading(false);
        }
    };

    // Get top 3 players
    const topPlayers = leaderboard.slice(0, 3).map(player => ({
        ...player,
        score: player.score ?? player.xp ?? 0,
        avatar: player.avatar || null,
        rankIcon: getRankIcon(player.score ?? player.xp ?? 0),
        rankName: getRankName(player.score ?? player.xp ?? 0)
    }));

    // Get remaining players (4th onwards)
    const otherPlayers = leaderboard.slice(3).map(player => ({
        ...player,
        score: player.score ?? player.xp ?? 0,
        avatar: player.avatar || null,
        rankIcon: getRankIcon(player.score ?? player.xp ?? 0),
        rankName: getRankName(player.score ?? player.xp ?? 0),
        trend: 'up'
    }));

    // Current user's rank
    const userInLeaderboard = leaderboard.find(p => p.id === user?.id);
    const userRank = userInLeaderboard ? {
        rank: userInLeaderboard.rank,
        name: user?.name || user?.username || 'You',
        score: userInLeaderboard.score ?? userInLeaderboard.xp ?? 0,
        avatar: user?.avatar || null,
        rankIcon: getRankIcon(userInLeaderboard.score ?? userInLeaderboard.xp ?? 0),
        rankName: getRankName(userInLeaderboard.score ?? userInLeaderboard.xp ?? 0)
    } : {
        rank: '-',
        name: user?.name || user?.username || 'You',
        score: user?.exp || user?.xp || 0,
        avatar: user?.avatar || null,
        rankIcon: getRankIcon(user?.exp || user?.xp || 0),
        rankName: getRankName(user?.exp || user?.xp || 0)
    };

    // Helper: render avatar or letter initial fallback
    const AvatarOrInitial = ({ src, name, size = 'w-full h-full', textSize = 'text-xl', className = '' }) => (
        src ? (
            <img src={src} className={`${size} object-cover rounded-full ${className}`} alt="" />
        ) : (
            <div className={`${size} flex items-center justify-center rounded-full bg-slate-800 ${className}`}>
                <span className={`${textSize} font-black text-cyan-400 uppercase select-none`}>
                    {name?.charAt(0) || '?'}
                </span>
            </div>
        )
    );

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    };

    const podiumVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.8 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", bounce: 0.4, duration: 0.8 }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-galsb overflow-hidden">
                    {/* Background Visuals */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,#000000_100%)] opacity-40" />
                        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
                            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                        {/* Scanning Bar Effect */}
                        <motion.div
                            animate={{ top: ['-10%', '110%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className={`absolute left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-${currentTheme.colors.primary}-500/10 to-transparent pointer-events-none z-10`}
                        />
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel} border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,1)] flex flex-col relative z-10 backdrop-blur-2xl`}
                    >
                        {/* THEME ACCENTS */}
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${currentTheme.colors.primary}-500/50 to-transparent opacity-50`} />
                        <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${currentTheme.colors.secondary}-500/50 to-transparent opacity-50`} />

                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />

                        {/* HEADER */}
                        <motion.div
                            variants={itemVariants}
                            className="px-10 py-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]"
                        >
                            <div className="flex items-center gap-6">
                                <img src={leaderboardIcon} alt="" className="w-14 h-14 object-contain brightness-125" />
                                <div className="space-y-1">
                                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center">
                                        GLOBAL <span className={`text-${currentTheme.colors.primary}-400 ml-2`}>BOARD</span>
                                        <motion.span
                                            animate={{ opacity: [1, 0, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            className={`ml-2 w-2 h-8 bg-${currentTheme.colors.primary}-500`}
                                        />
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full bg-${currentTheme.colors.secondary}-500 animate-pulse`} /> REALTIME LEADERBOARD
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex p-1 bg-slate-900/80 rounded-xl border border-white/5 backdrop-blur-md">
                                    {['weekly', 'alltime'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => { playClick(); setTimeframe(t); }}
                                            className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase transition-all tracking-widest relative overflow-hidden group ${timeframe === t ? `bg-${currentTheme.colors.primary}-500 text-white shadow-lg shadow-${currentTheme.colors.primary}-500/20` : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {timeframe === t && (
                                                <motion.div
                                                    layoutId="tab-glow"
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                                                />
                                            )}
                                            {t === 'weekly' ? 'Weekly' : 'All Time'}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { playClick(); setShowRankLegend(true); }}
                                    className={`p-2.5 bg-slate-800/50 hover:bg-${currentTheme.colors.primary}-500 border border-white/10 hover:border-${currentTheme.colors.primary}-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 group`}
                                    title="View Ranks"
                                >
                                    <Shield className={`w-6 h-6 group-hover:scale-110 transition-transform`} />
                                </button>
                                <button
                                    onClick={() => { playCancel(); onClose(); }}
                                    className={`w-12 h-12 flex items-center justify-center bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-180`}
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </motion.div>



                        {/* MAIN CONTENT SPLIT */}
                        <div className="flex-1 flex overflow-hidden">

                            {/* LEFT: PODIUM (TOP 3) */}
                            <div className="w-[42%] border-r border-white/5 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-white/[0.01] to-transparent">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <Loader2 className={`w-12 h-12 text-${currentTheme.colors.primary}-400 animate-spin`} />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Rankings...</p>
                                    </div>
                                ) : topPlayers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                                        <Trophy className="w-16 h-16 text-slate-700" />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Rankings Yet</p>
                                        <p className="text-slate-600 text-xs">Be the first to climb the leaderboard!</p>
                                    </div>
                                ) : (
                                    <div className="flex items-end justify-center gap-4 w-full">
                                        {/* 2nd Place */}
                                        {topPlayers[1] ? (
                                            <motion.div
                                                variants={podiumVariants}
                                                className="flex-1 flex flex-col items-center max-w-[140px]"
                                                onClick={() => handleViewPlayerProfile(topPlayers[1]?.id)}
                                            >
                                                <div className="relative mb-6 group cursor-pointer">
                                                    <div className="w-24 h-24 rounded-full border-2 border-slate-400 p-1 bg-slate-900 relative z-10 group-hover:scale-110 transition-transform duration-500">
                                                        <AvatarOrInitial src={topPlayers[1].avatar} name={topPlayers[1].name} textSize="text-2xl" />
                                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-400 text-slate-950 font-black rounded-full flex items-center justify-center border-2 border-slate-900 text-sm">2</div>
                                                    </div>
                                                    <motion.div
                                                        animate={{ scale: [1, 1.1, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 z-20"
                                                    >
                                                        <img src={topPlayers[1].rankIcon} className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" alt="" />
                                                    </motion.div>
                                                </div>
                                                <div className="text-center w-full">
                                                    <h3 className="text-sm font-black text-white uppercase italic truncate mb-0.5">{topPlayers[1].name}</h3>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">{topPlayers[1].rankName}</p>
                                                    <div className={`bg-slate-900/50 border border-white/10 rounded-lg py-1.5 px-3 group hover:border-${currentTheme.colors.primary}-500/50 transition-colors mb-2`}>
                                                        <span className={`text-xs font-black text-${currentTheme.colors.primary}-400 group-hover:text-white transition-colors`}>{topPlayers[1].score.toLocaleString()} <span className="text-[8px] opacity-60">EXP</span></span>
                                                    </div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{topPlayers[1].battles_won || 0} Battles Won</div>
                                                </div>
                                            </motion.div>
                                        ) : <div className="flex-1 max-w-[140px]" />}

                                        {/* 1st Place */}
                                        <motion.div
                                            variants={podiumVariants}
                                            className="flex-1 flex flex-col items-center max-w-[180px] -mt-16"
                                            onClick={() => handleViewPlayerProfile(topPlayers[0]?.id)}
                                        >
                                            <div className="relative mb-8 group cursor-pointer">
                                                <div className={`absolute inset-0 bg-${currentTheme.colors.secondary}-500/20 blur-3xl animate-pulse rounded-full`} />
                                                <div className={`w-32 h-32 rounded-full border-4 border-${currentTheme.colors.secondary}-400 p-1.5 bg-slate-900 relative z-10 shadow-[0_0_30px_rgba(var(--theme-secondary-rgb),0.2)] group-hover:scale-110 transition-transform duration-500`}>
                                                    <AvatarOrInitial src={topPlayers[0].avatar} name={topPlayers[0].name} textSize="text-3xl" />
                                                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-500 text-slate-950 font-black rounded-full flex items-center justify-center border-4 border-slate-900 text-lg">1</div>
                                                </div>
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ duration: 3, repeat: Infinity }}
                                                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 z-20"
                                                >
                                                    <img src={topPlayers[0].rankIcon} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" alt="" />
                                                </motion.div>
                                            </div>
                                            <div className="text-center w-full">
                                                <h3 className={`text-xl font-black text-white uppercase italic truncate mb-1 group-hover:text-${currentTheme.colors.secondary}-400 transition-colors tracking-tight`}>{topPlayers[0].name}</h3>
                                                <p className={`text-[10px] font-bold text-${currentTheme.colors.secondary}-500/80 uppercase tracking-[0.2em] mb-3`}>{topPlayers[0].rankName}</p>
                                                <div className={`bg-${currentTheme.colors.secondary}-500/10 border border-${currentTheme.colors.secondary}-500/30 rounded-xl py-2 px-6 shadow-lg shadow-${currentTheme.colors.secondary}-500/5 group hover:bg-${currentTheme.colors.secondary}-500/20 transition-all duration-300 mb-2`}>
                                                    <span className={`text-lg font-black text-${currentTheme.colors.secondary}-500 group-hover:text-white transition-colors`}>{topPlayers[0].score.toLocaleString()} <span className="text-xs opacity-60 uppercase font-mono">EXP</span></span>
                                                </div>
                                                <div className={`text-[10px] font-bold text-${currentTheme.colors.secondary}-400 uppercase tracking-widest`}>{topPlayers[0].battles_won || 0} Battles Won</div>
                                            </div>
                                        </motion.div>

                                        {/* 3rd Place */}
                                        {topPlayers[2] ? (
                                            <motion.div
                                                variants={podiumVariants}
                                                className="flex-1 flex flex-col items-center max-w-[140px]"
                                                onClick={() => handleViewPlayerProfile(topPlayers[2]?.id)}
                                            >
                                                <div className="relative mb-6 group cursor-pointer">
                                                    <div className="w-24 h-24 rounded-full border-2 border-orange-700 p-1 bg-slate-900 relative z-10 group-hover:scale-110 transition-transform duration-500">
                                                        <AvatarOrInitial src={topPlayers[2].avatar} name={topPlayers[2].name} textSize="text-2xl" />
                                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-700 text-orange-50 font-black rounded-full flex items-center justify-center border-2 border-slate-900 text-sm">3</div>
                                                    </div>
                                                    <motion.div
                                                        animate={{ scale: [1, 1.1, 1] }}
                                                        transition={{ duration: 2.5, repeat: Infinity }}
                                                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 z-20"
                                                    >
                                                        <img src={topPlayers[2].rankIcon} className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(194,65,12,0.3)]" alt="" />
                                                    </motion.div>
                                                </div>
                                                <div className="text-center w-full">
                                                    <h3 className="text-sm font-black text-white uppercase italic truncate mb-0.5">{topPlayers[2].name}</h3>
                                                    <p className="text-[9px] font-bold text-orange-400/60 uppercase tracking-wider mb-2">{topPlayers[2].rankName}</p>
                                                    <div className="bg-slate-900/50 border border-white/10 rounded-lg py-1.5 px-3 group hover:border-orange-500/50 transition-colors mb-2">
                                                        <span className="text-xs font-black text-orange-700 group-hover:text-white transition-colors">{topPlayers[2].score.toLocaleString()} <span className="text-[8px] opacity-60">EXP</span></span>
                                                    </div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{topPlayers[2].battles_won || 0} Battles Won</div>
                                                </div>
                                            </motion.div>
                                        ) : <div className="flex-1 max-w-[140px]" />}
                                    </div>
                                )}

                                {/* Podium Base Decorations */}
                                <motion.div
                                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className={`mt-16 w-full max-w-sm h-1 bg-gradient-to-r from-transparent via-${currentTheme.colors.primary}-500/50 to-transparent`}
                                />
                                <div className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] mt-4 italic opacity-30">Top Performance Tier</div>
                            </div>

                            {/* RIGHT: LIST */}
                            <div className="flex-1 flex flex-col relative bg-black/40">
                                <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar space-y-3 pb-32">
                                    {otherPlayers.map((player) => (
                                        <motion.div
                                            key={player.rank}
                                            variants={itemVariants}
                                            className={`flex items-center gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-${currentTheme.colors.primary}-500/20 active:scale-[0.98] transition-all group relative overflow-hidden cursor-pointer`}
                                            onClick={() => handleViewPlayerProfile(player.id)}
                                        >
                                            <div className={`w-8 text-center text-xl font-black text-slate-700 group-hover:text-${currentTheme.colors.primary}-500 transition-colors italic`}>
                                                {player.rank}
                                            </div>

                                            <div className={`w-12 h-12 rounded-full border border-white/10 bg-slate-900 p-0.5 shrink-0 group-hover:border-${currentTheme.colors.primary}-500 transition-all duration-300 group-hover:scale-105`}>
                                                <AvatarOrInitial src={player.avatar} name={player.name} textSize="text-lg" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-sm font-black text-white uppercase italic group-hover:translate-x-1 transition-transform">{player.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <img src={player.rankIcon} className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" alt="" />
                                                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter italic group-hover:text-slate-300">{player.rankName}</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <motion.div
                                                    whileHover={{ scale: 1.1 }}
                                                    className={`text-lg font-black text-white group-hover:text-${currentTheme.colors.primary}-400 flex items-baseline justify-end gap-1`}
                                                >
                                                    {player.score.toLocaleString()} <span className="text-[10px] opacity-60 font-mono">EXP</span>
                                                </motion.div>
                                                <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{player.battles_won || 0} Battles Won</div>
                                            </div>

                                            {/* Technical Hover Accent */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${currentTheme.colors.primary}-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                            <div className="absolute top-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className={`absolute top-0 right-0 border-t border-r border-${currentTheme.colors.primary}-500/50 w-full h-full`} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* FIXED FOOTER: YOU */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 px-10 bg-gradient-to-t from-[#02040a] via-[#02040a] to-transparent pt-12 pointer-events-none">
                                    <motion.div
                                        variants={itemVariants}
                                        className={`pointer-events-auto bg-${currentTheme.colors.primary}-600/90 border border-${currentTheme.colors.primary}-400 rounded-2xl p-4 flex items-center gap-6 shadow-[0_0_30px_rgba(var(--theme-primary-rgb),0.3)] relative overflow-hidden group backdrop-blur-md`}
                                    >
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
                                        <motion.div
                                            animate={{ x: ['-200%', '200%'] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                                        />

                                        <div className="w-8 text-center text-2xl font-black text-white italic">
                                            {userRank.rank}
                                        </div>

                                        <div className="w-14 h-14 rounded-full border-2 border-white/40 p-1 bg-slate-900 shrink-0 group-hover:rotate-6 transition-transform">
                                            <AvatarOrInitial src={userRank.avatar} name={userRank.name} textSize="text-xl" />
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-base font-black text-white uppercase italic tracking-tighter line-clamp-1">{userRank.name}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <img src={userRank.rankIcon} className="w-7 h-7 object-contain" alt="" />
                                                <span className={`text-[11px] uppercase font-black text-${currentTheme.colors.primary}-100 italic tracking-tighter`}>{userRank.rankName}</span>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end">
                                            <div className="text-2xl font-black text-white leading-none tracking-tighter">{userRank.score.toLocaleString()}</div>
                                            <div className="text-[9px] font-bold text-white uppercase tracking-widest mt-1 opacity-80 italic">Current EXP</div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                        </div>
                    </motion.div >

                    {/* Rank Legend Modal */}
                    < RankLegendModal
                        isOpen={showRankLegend}
                        onClose={() => setShowRankLegend(false)}
                    />

                    {/* Player Profile Viewer Overlay */}
                    <AnimatePresence>
                        {isPlayerViewerOpen && (
                            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`w-full max-w-lg ${currentTheme.colors.panel} border border-${currentTheme.colors.primary}-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden`}
                                >
                                    <button
                                        onClick={() => setIsPlayerViewerOpen(false)}
                                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-20"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    
                                    {isPlayerLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className={`w-12 h-12 border-4 border-${currentTheme.colors.primary}-500 border-t-transparent rounded-full animate-spin`} />
                                            <p className={`text-${currentTheme.colors.primary}-400/80 font-black uppercase tracking-widest text-xs`}>Loading Profile...</p>
                                        </div>
                                    ) : selectedPlayer ? (
                                        <div className="flex flex-col items-center relative z-10 font-galsb">
                                            <div className="relative mb-6">
                                                <div className={`w-32 h-32 rounded-3xl overflow-hidden border-2 border-${currentTheme.colors.primary}-400 shadow-[0_0_30px_rgba(var(--theme-primary-rgb),0.2)]`}>
                                                    {selectedPlayer.avatar_url || selectedPlayer.avatar ? (
                                                        <img src={selectedPlayer.avatar_url || selectedPlayer.avatar} className="w-full h-full object-cover" alt="Avatar" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                            <User className="w-16 h-16 text-slate-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-3 -right-3 w-10 h-10 bg-slate-900 border border-${currentTheme.colors.primary}-500/30 rounded-xl flex items-center justify-center shadow-lg`}>
                                                    <span className={`text-${currentTheme.colors.primary}-400 font-black text-sm`}>{selectedPlayer.level || 1}</span>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-1 relative z-10 text-center">
                                                {selectedPlayer.username || selectedPlayer.name || 'Unknown User'}
                                            </h3>
                                            <div className="flex items-center gap-3 mb-6">
                                                <span className={`px-3 py-1 rounded-md bg-${currentTheme.colors.primary}-500/10 border border-${currentTheme.colors.primary}-500/20 text-${currentTheme.colors.primary}-400 text-[9px] font-black uppercase tracking-widest`}>
                                                    {selectedPlayer.rank_name || getRankName(selectedPlayer.xp || selectedPlayer.exp || 0)}
                                                </span>
                                            </div>

                                            {/* Core Stats */}
                                            <div className="w-full grid grid-cols-2 gap-3 mb-3">
                                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Exp</p>
                                                    <p className="text-xl font-black text-purple-400">{(selectedPlayer.xp || selectedPlayer.exp || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
                                                    <p className="text-xl font-black text-emerald-400">
                                                        {selectedPlayer.win_rate || '0%'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Achievements & Certificates */}
                                            <div className="w-full grid grid-cols-2 gap-3 mb-3">
                                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                                                    <Trophy className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Achievements</p>
                                                    <p className="text-lg font-black text-amber-400">{selectedPlayer.achievements || 0}</p>
                                                </div>
                                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                                                    <Award className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Certificates</p>
                                                    <p className="text-lg font-black text-emerald-400">{selectedPlayer.certificates || 0}</p>
                                                </div>
                                            </div>

                                            {/* Battle Stats */}
                                            <div className="w-full bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2">
                                                    <Swords className="w-3 h-3 text-rose-400" /> Battle Record
                                                </p>
                                                <div className="grid grid-cols-3 gap-3 text-center">
                                                    <div>
                                                        <p className="text-lg font-black text-emerald-400">{selectedPlayer.battle_wins || 0}</p>
                                                        <p className="text-[9px] uppercase text-slate-500 font-bold">Wins</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-black text-rose-400">{selectedPlayer.battle_losses || 0}</p>
                                                        <p className="text-[9px] uppercase text-slate-500 font-bold">Losses</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-black text-slate-300">{(selectedPlayer.battle_wins || 0) + (selectedPlayer.battle_losses || 0)}</p>
                                                        <p className="text-[9px] uppercase text-slate-500 font-bold">Total</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center text-rose-400 font-bold uppercase tracking-widest text-xs">
                                            User Not Found
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div >
            )}
        </AnimatePresence >
    );
};

export default LeaderboardModal;
