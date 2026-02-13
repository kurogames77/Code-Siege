import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Play, ChevronRight, Shield, Check } from 'lucide-react';
import playIcon from '../../assets/playbutton.png';
import useSound from '../../hooks/useSound';

const TowerNode = ({ tower, position, onPlay, isDragging }) => {
    const { name, current, total, image, isLocked, infoAbove, isAvailable = true } = tower;
    const progress = (current / total) * 100;
    const isCompleted = progress === 100;
    const [hover, setHover] = React.useState(false);
    const { playClick, playCancel } = useSound();

    return (
        <div
            className={`absolute flex ${infoAbove ? 'flex-col-reverse' : 'flex-col'} items-center group transition-all duration-300 ${isDragging ? 'pointer-events-none' : ''}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: tower.id === 1 ? 30 : 20,
            }}
        >
            {/* Play Button positioned tightly ABOVE the tower image for the first tower */}
            {tower.id === 1 && !isLocked && isAvailable && tower.current === 0 && (
                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                        onPlay(tower.id);
                    }}
                    className={`w-18 h-18 nav-item-zoom z-20 animate-bounce cursor-pointer relative ${infoAbove ? 'mt-8 -mb-12' : '-mb-6'}`}
                >
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse" />
                    <img src={playIcon} alt="Play" className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] relative z-10" />
                </button>
            )}

            {/* Tower Image with localized glow */}
            <motion.div
                className={`relative cursor-pointer z-10`}
                whileHover={{ scale: 1.1, filter: "brightness(1.2)" }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked && isAvailable) {
                        playClick();
                        onPlay(tower.id);
                    } else {
                        playCancel();
                    }
                }}
            >
                <div className={`transition-all duration-500 ease-out ${isLocked
                    ? 'grayscale opacity-70 brightness-150 group-hover:grayscale-0 group-hover:opacity-100 group-hover:brightness-125'
                    : 'drop-shadow-[0_0_35px_rgba(34,211,238,0.4)]'
                    }`}>
                    <img
                        src={image}
                        alt={name}
                        className="w-36 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                    />
                </div>

                {/* Glow for all towers (active on hover) */}
                <div className={`absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full transition-all duration-500 pointer-events-none scale-75 group-hover:scale-110 
                    ${isLocked ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                `} />

                {/* CLEARED MARK - Floating Checkmark */}
                {isCompleted && (
                    <motion.div
                        className="absolute -top-6 -right-6 z-30"
                        initial={{ scale: 0, opacity: 0, rotate: -45 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 20,
                            delay: 0.2
                        }}
                    >
                        <div className="relative flex items-center justify-center w-12 h-12">
                            {/* Spinning Glow Background */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full blur-md opacity-60"
                            />
                            {/* Solid Circle */}
                            <div className="absolute inset-2 bg-[#1a1f2e] rounded-full border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center">
                                <Check className="w-5 h-5 text-yellow-400 stroke-[4]" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Holographic Info Card */}
            <motion.div
                className={`flex flex-col items-center min-w-[220px] transition-all z-20 cursor-pointer ${infoAbove ? 'mb-4' : 'mt-4'}`}
                initial={{ opacity: 0, y: infoAbove ? 20 : -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked && isAvailable) {
                        playClick();
                        onPlay(tower.id);
                    } else {
                        playCancel();
                    }
                }}
            >
                {/* Glass Container */}
                <div className={`relative w-full overflow-hidden rounded-xl border backdrop-blur-xl transition-colors duration-300 ${isLocked
                    ? 'bg-slate-900/60 border-slate-700/50 group-hover:border-cyan-500/30 group-hover:bg-slate-900/80'
                    : 'bg-black/60 border-cyan-500/30 group-hover:border-cyan-400/60 group-hover:bg-slate-900/80 shadow-[0_0_30px_rgba(34,211,238,0.15)]'
                    }`}>

                    {/* Scanline Effect - Show on hover for locked ones too? Maybe keep slightly subtle */}
                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent opacity-30 animate-scan pointer-events-none ${isLocked ? 'hidden group-hover:block' : ''}`} />

                    {/* Content */}
                    <div className="p-4 relative z-10">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-xs font-black uppercase tracking-[0.15em] transition-colors ${isLocked || !isAvailable ? 'text-slate-400 group-hover:text-white' : 'text-white'}`}>
                                {name}
                            </span>
                            {isLocked || !isAvailable ? (
                                <Lock className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                            ) : (
                                <Shield className="w-3 h-3 text-cyan-400" />
                            )}
                        </div>

                        {/* Stats Row */}
                        {!isLocked && isAvailable && (
                            <div className="flex justify-between items-center text-[10px] font-bold mb-2">
                                <span className="text-cyan-400/80 flex items-center gap-1">
                                    PROCESS <span className="animate-pulse">●</span>
                                </span>
                                <span className="text-white tabular-nums">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                        )}

                        {/* Progress Bar Container */}
                        <div className="relative h-2.5 w-full bg-black/80 rounded-full overflow-hidden border border-white/5">
                            {/* Grid Background in Bar */}
                            <div className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
                                    backgroundSize: '4px 4px'
                                }}
                            />

                            {/* Active Bar */}
                            <motion.div
                                className={`h-full relative ${isLocked || !isAvailable
                                    ? 'bg-slate-700'
                                    : isCompleted
                                        ? 'bg-cyan-400'
                                        : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400'
                                    }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${!isAvailable ? 0 : progress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            >
                                {/* Moving Glare */}
                                {!isLocked && isAvailable && (
                                    <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-l from-white/40 to-transparent skew-x-12 animate-shimmer" />
                                )}
                            </motion.div>
                        </div>

                        {/* Footer Info */}
                        <div className="mt-3 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                {!isAvailable ? 'COMING SOON' : `${current}/${total} CLEARED`}
                            </span>
                            {!isLocked && isAvailable && (
                                <motion.div
                                    className="flex items-center gap-1 text-[9px] font-black text-cyan-400"
                                    animate={{ x: [0, 3, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    {isCompleted ? 'COMPLETED' : 'ENTER'} <ChevronRight className="w-3 h-3" />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TowerNode;
