import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Info } from 'lucide-react';
import useSound from '../../hooks/useSound';
import { useTheme } from '../../contexts/ThemeContext';
import leaderboardIcon from '../../assets/leaderboard.png';
import { RANKS } from '../../utils/rankSystem';

const RankLegendModal = ({ isOpen, onClose }) => {
    const { playCancel } = useSound();
    const { currentTheme } = useTheme();

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
                            className={`absolute left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-${currentTheme.colors.primary}-500/10 to-transparent pointer-events-none z-10`}
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel || 'bg-[#02040a]/90'} border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,1)] flex flex-col relative z-20 backdrop-blur-2xl`}
                    >
                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />

                        {/* HEADER */}
                        <div className="px-10 py-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                            <div className="flex items-center gap-6">
                                <img src={leaderboardIcon} alt="" className="w-14 h-14 object-contain brightness-125" />
                                <div className="space-y-1">
                                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center">
                                        RANK <span className={`text-${currentTheme.colors.primary}-400 ml-2`}>HIERARCHY</span>
                                        <motion.span
                                            animate={{ opacity: [1, 0, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            className={`ml-2 w-2 h-8 bg-${currentTheme.colors.primary}-500`}
                                        />
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full bg-${currentTheme.colors.secondary}-500 animate-pulse`} /> BADGE AND EXP
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
                                {[...RANKS].reverse().map((rank, index) => (
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
                                                {rank.range}
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
