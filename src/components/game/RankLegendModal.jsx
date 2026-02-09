import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Info } from 'lucide-react';
import useSound from '../../hooks/useSound';
import leaderboardIcon from '../../assets/leaderboard.png';

// Import all rank badges
import rank1 from '../../assets/rankbadges/rank1.png';
import rank2 from '../../assets/rankbadges/rank2.png';
import rank3 from '../../assets/rankbadges/rank3.png';
import rank4 from '../../assets/rankbadges/rank4.png';
import rank5 from '../../assets/rankbadges/rank5.png';
import rank6 from '../../assets/rankbadges/rank6.png';
import rank7 from '../../assets/rankbadges/rank7.png';
import rank8 from '../../assets/rankbadges/rank8.png';
import rank9 from '../../assets/rankbadges/rank9.png';
import rank10 from '../../assets/rankbadges/rank10.png';
import rank11 from '../../assets/rankbadges/rank11.png';
import rank12 from '../../assets/rankbadges/rank12.png';

const ranks = [
    { level: '50+', name: 'SIEGE DEITY', icon: rank12, color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/10' },
    { level: '45+', name: 'APEX LEGEND', icon: rank11, color: 'text-rose-400', border: 'border-rose-500/50', bg: 'bg-rose-500/10' },
    { level: '40+', name: 'GRANDMASTER HACKER', icon: rank10, color: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-500/10' },
    { level: '35+', name: 'ELITE COMPILER', icon: rank9, color: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'bg-cyan-500/10' },
    { level: '30+', name: 'SYSTEM SENTINEL', icon: rank8, color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
    { level: '25+', name: 'CODE WARRIOR', icon: rank7, color: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-500/10' },
    { level: '20+', name: 'SCRIPT MASTER', icon: rank6, color: 'text-indigo-400', border: 'border-indigo-500/50', bg: 'bg-indigo-500/10' },
    { level: '15+', name: 'DEBUG KNIGHT', icon: rank5, color: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500/10' },
    { level: '10+', name: 'SYNTAX SOLDIER', icon: rank4, color: 'text-teal-400', border: 'border-teal-500/50', bg: 'bg-teal-500/10' },
    { level: '7+', name: 'BINARY APPRENTICE', icon: rank3, color: 'text-lime-400', border: 'border-lime-500/50', bg: 'bg-lime-500/10' },
    { level: '4+', name: 'CODE INITIATE', icon: rank2, color: 'text-slate-300', border: 'border-slate-500/50', bg: 'bg-slate-500/10' },
    { level: '1+', name: 'SIEGE NOVICE', icon: rank1, color: 'text-slate-500', border: 'border-slate-700/50', bg: 'bg-slate-700/10' },
];

const RankLegendModal = ({ isOpen, onClose }) => {
    const { playCancel } = useSound();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl font-galsb overflow-hidden">
                    {/* Background Visuals */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,#000000_100%)] opacity-40" />
                        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
                            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                        {/* Scanning Bar Effect */}
                        <motion.div
                            animate={{ top: ['-10%', '110%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none z-10"
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-[90vw] h-[85vh] bg-[#02040a]/90 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,1)] flex flex-col relative z-20 backdrop-blur-2xl"
                    >
                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />

                        {/* HEADER */}
                        <div className="px-10 py-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                            <div className="flex items-center gap-6">
                                <img src={leaderboardIcon} alt="" className="w-14 h-14 object-contain brightness-125" />
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center">
                                        RANK <span className="text-cyan-400 ml-2">HIERARCHY</span>
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                                        BADGE AND LEVEL
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { playCancel(); onClose(); }}
                                className="p-2.5 bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-90"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* GRID CONTENT */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {ranks.map((rank, index) => (
                                    <motion.div
                                        key={rank.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`relative group bg-slate-900/40 border ${rank.border} rounded-3xl p-6 flex flex-col items-center gap-4 hover:bg-white/5 transition-all duration-300`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 rounded-3xl" />

                                        <div className={`w-24 h-24 relative z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                                            <img src={rank.icon} className="w-full h-full object-contain" alt={rank.name} />
                                        </div>

                                        <div className="text-center relative z-10">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                Level {rank.level}
                                            </div>
                                            <h3 className={`text-lg font-black italic uppercase tracking-tighter ${rank.color}`}>
                                                {rank.name}
                                            </h3>
                                        </div>

                                        {/* Hover Effect Line */}
                                        <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-50 transition-opacity ${rank.color}`} />
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RankLegendModal;
