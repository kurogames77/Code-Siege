import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { X, Swords, Users, Trophy } from 'lucide-react';
import rankingIcon from '../../assets/ranking.png';
import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';

// 3D Tilt Card Component
const TiltCard = ({ children, onClick, color, delay }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={`group relative h-72 rounded-[2rem] bg-slate-900 border border-white/5 cursor-pointer perspective-1000`}
        >
            <div className={`absolute inset-0 rounded-[2rem] border-2 bg-gradient-to-br transition-all duration-500 opacity-0 group-hover:opacity-100 ${color === 'rose' ? 'from-rose-500/50 to-transparent border-rose-500' : 'from-cyan-500/50 to-transparent border-cyan-500'}`} style={{ transform: "translateZ(0px)" }} />

            {/* Content Container */}
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden" style={{ transform: "translateZ(20px)" }}>
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${color === 'rose' ? 'from-rose-900 via-[#0B1221] to-[#0B1221]' : 'from-cyan-900 via-[#0B1221] to-[#0B1221]'}`} />

                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity duration-500"
                    style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between items-center z-20">
                    {/* Icon Box */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg ${color === 'rose' ? 'bg-rose-500/10 border border-rose-500/20 group-hover:bg-rose-500 group-hover:shadow-rose-500/40' : 'bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:shadow-cyan-500/40'}`}>
                        <div className={`text-white transition-colors duration-300 ${color === 'rose' ? 'text-rose-500 group-hover:text-white' : 'text-cyan-500 group-hover:text-white'}`}>
                            {children.icon}
                        </div>
                    </div>

                    <div className="w-full text-center flex flex-col items-center">
                        <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-2 transition-all duration-300 translate-x-0 group-hover:translate-y-[-2px] ${color === 'rose' ? 'group-hover:text-rose-400 text-white' : 'group-hover:text-cyan-400 text-white'}`}>
                            {children.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4 group-hover:text-slate-200 transition-colors max-w-[90%]">
                            {children.description}
                        </p>

                        <div className={`w-full relative px-8 py-4 rounded-xl overflow-hidden font-black uppercase tracking-widest text-center text-sm transition-all duration-300 border ${color === 'rose' ? 'bg-rose-500/0 border-rose-500/30 text-rose-400 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600' : 'bg-cyan-500/0 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-600'}`}>
                            <span className="relative z-10">{children.buttonText}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const RankingModal = ({ isOpen, onClose, onEnterDuel, onJoinMultiplayer }) => {
    const { playClick, playCancel } = useSound();
    const { user } = useUser();
    const { currentTheme } = useTheme();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl font-galsb overflow-hidden">
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
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="w-full max-w-[90vw] h-[85vh] bg-[#030712]/90 border border-indigo-500/20 rounded-[2.5rem] overflow-hidden shadow-[0_0_150px_rgba(99,102,241,0.2)] relative flex flex-col p-8 backdrop-blur-3xl z-10"
                    >
                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />
                        {/* Header */}
                        <div className="relative flex items-center justify-center mb-8 z-10">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <div className={`absolute inset-0 bg-${currentTheme.colors.primary}-500/40 blur-2xl rounded-full animate-pulse group-hover:bg-${currentTheme.colors.primary}-400/60 transition-all duration-500`} />
                                    <img src={rankingIcon} alt="Arena" className={`w-16 h-16 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.5)] group-hover:scale-110 transition-transform duration-500`} />
                                </div>
                                <div className="flex flex-col items-center text-center">
                                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-2 flex items-center">
                                        ARENA <span className={`text-${currentTheme.colors.primary}-400 ml-2`}>SELECTION</span>
                                        <motion.span
                                            animate={{ opacity: [1, 0, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            className={`ml-2 w-2 h-8 bg-${currentTheme.colors.primary}-500`}
                                        />
                                    </h2>
                                    <div className="flex items-center gap-3 opacity-80">
                                        <div className={`h-[2px] w-12 bg-gradient-to-r from-transparent to-${currentTheme.colors.primary}-500/50`} />
                                        <p className={`text-xs text-${currentTheme.colors.primary}-400 font-bold uppercase tracking-[0.4em] flex items-center gap-2`}>
                                            <Trophy className="w-3 h-3" /> 1v1 Duel or Multiplayer
                                        </p>
                                        <div className={`h-[2px] w-12 bg-gradient-to-l from-transparent to-${currentTheme.colors.primary}-500/50`} />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => { playCancel(); onClose(); }}
                                className="absolute right-0 top-0 w-12 h-12 flex items-center justify-center bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-180"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 perspective-1000">

                            <TiltCard
                                onClick={onEnterDuel}
                                color="rose"
                                delay={0.1}
                            >
                                {{
                                    icon: <Swords className="w-14 h-14" />,
                                    title: "1v1 Duel",
                                    description: "Execute high-speed logic battles against a single opponent. Winner takes all in this high-stakes debugging match.",
                                    buttonText: "Join 1v1"
                                }}
                            </TiltCard>

                            <TiltCard
                                onClick={onJoinMultiplayer}
                                color="cyan"
                                delay={0.2}
                            >
                                {{
                                    icon: <Users className="w-14 h-14" />,
                                    title: "Multiplayer",
                                    description: "Join the global mainframe and compete with multiple coders simultaneously in a battle for leaderboard dominance.",
                                    buttonText: "Join Multiplayer"
                                }}
                            </TiltCard>

                        </div>

                        {/* Background Decoration */}
                        <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] bg-rose-600/10 rounded-full blur-[150px] pointer-events-none z-0 mix-blend-screen" />
                        <div className="absolute bottom-[-50%] right-[-20%] w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none z-0 mix-blend-screen" />

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Subtle animated background component
const BackgroundEffect = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute bg-white/5 w-[1px] h-[100px]"
                    initial={{
                        opacity: 0,
                        top: -100,
                        left: `${Math.random() * 100}%`
                    }}
                    animate={{
                        opacity: [0, 0.5, 0],
                        top: ['0%', '100%']
                    }}
                    transition={{
                        duration: Math.random() * 5 + 3,
                        repeat: Infinity,
                        delay: Math.random() * 5,
                        ease: "linear"
                    }}
                />
            ))}
        </div>
    )
}

export default RankingModal;
