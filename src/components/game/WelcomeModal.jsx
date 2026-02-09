import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, ArrowRight, Sword, Scroll, Zap } from 'lucide-react';
import useSound from '../../hooks/useSound';

const WelcomeModal = ({ isOpen, onClose }) => {
    const { playClick, playSuccess } = useSound();

    React.useEffect(() => {
        if (isOpen) {
            playSuccess();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#0a0f1c] border border-cyan-500/30 rounded-2xl shadow-[0_0_80px_rgba(8,145,178,0.3)] overflow-hidden"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent" />

                    {/* Content */}
                    <div className="relative p-8 md:p-12 flex flex-col items-center text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="w-24 h-24 bg-cyan-950/50 rounded-full flex items-center justify-center mb-6 border-2 border-cyan-400/30 relative group"
                        >
                            <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full animate-pulse" />
                            <Shield className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter"
                        >
                            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Code Siege</span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-300 text-lg mb-8 leading-relaxed max-w-lg"
                        >
                            The realm is under siege. Only a master of code can unlock the ancient towers and save us.
                            <br /><br />
                            <span className="text-cyan-400 font-bold">Your journey begins now.</span>
                        </motion.p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
                            {[
                                { icon: Scroll, text: "Learn Code", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                                { icon: Zap, text: "Cast Spells", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                                { icon: Sword, text: "Battle Bosses", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + (i * 0.1) }}
                                    className={`flex flex-col items-center p-4 rounded-xl border ${item.border} ${item.bg} backdrop-blur-md`}
                                >
                                    <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
                                    <span className={`font-bold text-sm uppercase tracking-wider ${item.color}`}>{item.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            onClick={() => {
                                playClick();
                                onClose();
                            }}
                            className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xl uppercase tracking-widest rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                Start Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default WelcomeModal;
