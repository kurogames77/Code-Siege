
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

// Assets
import expIcon from '../../assets/exp.png';

const VictoryModal = ({ isOpen, rewards, onNextLevel, isLastLevel = false }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotateX: 20 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: -20 }}
                        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                        className="w-full max-w-md relative"
                    >
                        {/* Glow effect behind the modal */}
                        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl -z-10 rounded-full scale-150 animate-pulse" />

                        {/* Modal Container */}
                        <div className="bg-[#0f1219] border border-yellow-500/20 rounded-[2rem] overflow-hidden shadow-2xl relative">

                            {/* Decorative Top Gradient */}
                            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-yellow-500/10 via-yellow-500/5 to-transparent pointer-events-none" />

                            <div className="flex flex-col items-center p-10 pt-12 text-center relative z-10">

                                {/* Title */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFF5D1] to-[#FFD700] mb-2 uppercase drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)] font-galsb tracking-wide">
                                        {isLastLevel ? "Campaign Complete!" : "Victory!"}
                                    </h2>
                                    <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs mb-10">
                                        {isLastLevel ? "You have conquered this tower" : "Level Complete"}
                                    </p>
                                </motion.div>

                                {/* Rewards Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="w-full bg-gradient-to-b from-[#1a1f2e] to-[#111623] p-1 rounded-2xl border border-white/5 shadow-inner mb-8"
                                >
                                    <div className="rounded-xl bg-[#0b0e14]/50 p-6 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors" />

                                        <div className="relative flex flex-col items-center justify-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rewards Earned</span>

                                            <div className="flex items-center justify-center gap-4 scale-110">
                                                <div className="relative">
                                                    <img src={expIcon} alt="EXP" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full -z-10"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="text-2xl font-black text-white leading-none">+{rewards?.exp || 100}</span>
                                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Experience</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Continue Button */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 }}
                                    className="w-full"
                                >
                                    <Button
                                        onClick={onNextLevel}
                                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black py-3 rounded-xl flex items-center justify-center gap-3 font-black text-sm shadow-[0_0_30px_rgba(245,158,11,0.4)] group overflow-hidden relative"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        <span className="relative z-10">{isLastLevel ? "FINISH & RETURN TO MAP" : "CONTINUE TO NEXT LEVEL"}</span>
                                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>

                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VictoryModal;
