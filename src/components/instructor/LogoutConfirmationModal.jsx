import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';

const LogoutConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-galsb">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-sm bg-[#0B1224] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10"
                    >
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                                <LogOut className="w-10 h-10 text-rose-500" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-wider">
                                    Sign Out?
                                </h3>
                                <p className="text-sm font-bold text-slate-400">
                                    Are you sure you want to end your session?
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-rose-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LogoutConfirmationModal;
