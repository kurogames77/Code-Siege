import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Play, Sword } from 'lucide-react';

const FloorNode = ({ floor, isActive, isCompleted, isLocked, onEnter }) => {
    return (
        <div className="relative group w-full max-w-sm mx-auto">
            {/* Connector Line */}
            <div className="absolute left-1/2 -bottom-16 w-1 h-16 bg-gradient-to-t from-slate-800 to-slate-900 group-last:hidden" />

            <motion.div
                whileHover={!isLocked ? { scale: 1.05 } : {}}
                className={`relative z-10 p-6 rounded-3xl border transition-all duration-300 ${isActive
                    ? 'bg-primary/20 border-primary shadow-[0_0_40px_rgba(109,40,217,0.3)]'
                    : isCompleted
                        ? 'bg-slate-900/80 border-accent/30 opacity-80'
                        : isLocked
                            ? 'bg-slate-950 border-white/5 opacity-50 grayscale'
                            : 'bg-slate-900 border-white/10'
                    }`}
            >
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black italic border-2 border-dashed ${isActive
                            ? 'bg-primary text-white border-white/20'
                            : isCompleted
                                ? 'bg-accent/10 text-accent border-accent/20'
                                : 'bg-slate-800 text-slate-500 border-white/5'
                            }`}>
                            {floor}
                        </div>

                        <div className="space-y-1">
                            <h4 className={`font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                Floor Level 0{floor}
                            </h4>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-600">
                                {isCompleted ? 'CHALLENGE CLEARED' : isLocked ? 'LOCKED BY PRE-REQUISITE' : 'ACTIVE ASSAULT'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center">
                        {isCompleted ? (
                            <CheckCircle2 className="w-8 h-8 text-accent drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                        ) : isLocked ? (
                            <Lock className="w-6 h-6 text-slate-700" />
                        ) : (
                            <motion.button
                                onClick={onEnter}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-3 bg-primary rounded-xl text-white shadow-lg shadow-primary/40 hover:bg-primary-dark transition-colors cursor-pointer"
                            >
                                <Sword className="w-5 h-5 fill-current" />
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Status indicator for active floor */}
                {isActive && (
                    <motion.div
                        layoutId="active-glow"
                        className="absolute -inset-1 rounded-[26px] border-2 border-primary/50 animate-pulse pointer-events-none"
                    />
                )}
            </motion.div>

            {/* Medieval Platform Base Decor */}
            <div className="absolute -bottom-2 left-4 right-4 h-4 bg-slate-950 rounded-full border-t border-white/10 opacity-30 blur-sm" />
        </div>
    );
};

export default FloorNode;
