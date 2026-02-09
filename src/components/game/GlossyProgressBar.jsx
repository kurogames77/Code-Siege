import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

const GlossyProgressBar = ({ current, total, isLocked }) => {
    const percentage = Math.min(100, (current / total) * 100);

    return (
        <div className="flex items-center gap-2 group">
            {/* Progress Wrapper */}
            <div className={`relative h-10 px-6 flex items-center justify-center rounded-full border border-white/20 shadow-lg overflow-hidden transition-all duration-500 ${isLocked ? 'bg-slate-900/80 grayscale' : 'bg-gradient-to-b from-[#6d28d9]/80 to-[#4c1d95]/90'}`}>
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 pointer-events-none" />

                {/* Progress Fill */}
                {!isLocked && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="absolute left-0 h-full bg-gradient-to-r from-purple-400 to-purple-600 opacity-40 blur-sm"
                    />
                )}

                {/* Text Content */}
                <span className="relative z-10 text-white font-black italic tracking-tighter text-[10px] uppercase">
                    {current}/{total} FLOORS {isLocked ? 'LOCKED' : 'CLEARED'}
                </span>
            </div>

            {/* Lock Circle (Image 1 style) */}
            <div className={`w-10 h-10 rounded-full border border-white/20 flex items-center justify-center shadow-lg ${isLocked ? 'bg-slate-800' : 'bg-[#6d28d9]'}`}>
                <Lock className={`w-4 h-4 ${isLocked ? 'text-slate-500' : 'text-white'}`} />
            </div>
        </div>
    );
};

export default GlossyProgressBar;
