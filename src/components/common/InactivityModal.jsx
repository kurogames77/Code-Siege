import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, AlertTriangle } from 'lucide-react';

const InactivityModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-galsb">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                    >
                        {/* Header Decor */}
                        <div className="h-24 bg-gradient-to-b from-indigo-500/20 to-transparent flex items-center justify-center relative">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
                            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-indigo-500/30 flex items-center justify-center shadow-lg relative overflow-hidden group">
                                <div className="absolute inset-0 bg-indigo-500/10 transition-colors" />
                                <Moon className="w-8 h-8 text-indigo-400 relative z-10" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="px-8 pt-4 pb-8 text-center space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Session Expired</h3>
                                <div className="h-1 w-12 bg-indigo-500 mx-auto rounded-full opacity-50" />
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                You have been logged out due to extended inactivity to protect your account.
                            </p>

                            <div className="pt-4">
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Login Again
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default InactivityModal;
