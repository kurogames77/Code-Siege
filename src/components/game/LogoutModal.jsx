import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, AlertTriangle, Shield } from 'lucide-react';
import useSound from '../../hooks/useSound';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    const { playClick, playCancel } = useSound();
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-galsb">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Header Decor */}
                        <div className="h-24 bg-gradient-to-b from-rose-500/20 to-transparent flex items-center justify-center relative">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
                            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-rose-500/30 flex items-center justify-center shadow-lg relative overflow-hidden group">
                                <div className="absolute inset-0 bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors" />
                                <LogOut className="w-8 h-8 text-rose-500 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="px-8 pt-4 pb-8 text-center space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Terminate Session?</h3>
                                <div className="h-1 w-12 bg-rose-500 mx-auto rounded-full opacity-50" />
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                Your current progress will be secured. Are you sure you want to retreat to the login gates?
                            </p>

                            {/* Alert Box */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-white/5 text-left transition-colors hover:border-white/10 group">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <Shield className="w-4 h-4 text-amber-500" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                                    Progress will be synced with the Global Architects.
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button
                                    onClick={() => { playClick(); onClose(); }}
                                    className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700text-slate-300 font-black uppercase tracking-widest text-[10px] transition-all border border-white/5"
                                >
                                    Stay Here
                                </button>
                                <button
                                    onClick={() => { playCancel(); onConfirm(); }}
                                    className="py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_4px_30px_rgba(225,29,72,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* Top Close Button (Optional) */}
                        <button
                            onClick={() => { playCancel(); onClose(); }}
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

export default LogoutModal;
