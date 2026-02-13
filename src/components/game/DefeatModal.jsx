import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCw } from 'lucide-react';
import Button from '../ui/Button';

const DefeatModal = ({ isOpen, onRetry, losses }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-lg relative"
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-red-600/20 blur-3xl -z-10 rounded-full animate-pulse" />

                        <div className="bg-[#1a0f0f] border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl relative">
                            {/* Header Stripe */}
                            <div className="h-2 bg-gradient-to-r from-red-600 to-red-400" />

                            <div className="p-10 flex flex-col items-center text-center">
                                <div className="mb-6 relative">
                                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
                                    <AlertCircle className="w-14 h-14 text-red-500 relative z-10" />
                                </div>

                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-black text-white uppercase tracking-wider mb-2"
                                >
                                    Mission Failed
                                </motion.h2>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-red-400 font-mono text-sm mb-6 uppercase tracking-widest"
                                >
                                    You run out of time
                                </motion.p>

                                {/* Penalty Card if Losses prop is provided */}
                                {losses && (
                                    <div className="w-full bg-red-950/20 border border-red-500/30 p-4 rounded-xl mb-2 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                                        <div className="relative flex flex-col items-center justify-center gap-1">
                                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Penalty Assessment</span>
                                            <div className="flex items-center justify-center gap-3">
                                                {/* reusing expIcon if available or simple text */}
                                                <span className="text-2xl font-black text-red-500 font-mono tracking-tighter">-{losses?.exp || 0}</span>
                                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">EXP</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 w-full">
                                    <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg text-sm text-red-200/70 font-mono">
                                        Analysis: Temporal constraints exceeded.
                                        Sequence execution halted.
                                    </div>

                                    <Button
                                        onClick={onRetry}
                                        className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02]"
                                    >
                                        <RotateCw className="w-5 h-5" />
                                        Retry Level
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DefeatModal;
