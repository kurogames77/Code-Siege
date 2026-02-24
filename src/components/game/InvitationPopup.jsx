import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Users, Check, Clock } from 'lucide-react';
import useSound from '../../hooks/useSound';

const InvitationPopup = ({ invitation, onAccept, onDecline, onExpiry }) => {
    const { playSuccess, playCancel, playClick } = useSound();

    useEffect(() => {
        // Auto-expiry after 30 seconds
        const timer = setTimeout(() => {
            onExpiry();
        }, 30000);

        return () => clearTimeout(timer);
    }, [onExpiry]);

    if (!invitation) return null;

    const isDuel = invitation.type === 'duel_invite';
    const sender = invitation.sender;

    return (
        <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md pointer-events-auto"
        >
            <div className="bg-[#0B1221]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.2)] p-4 overflow-hidden relative">
                {/* Background Decor */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 ${isDuel ? 'bg-rose-500' : 'bg-cyan-500'}`} />

                <div className="flex items-center gap-4 relative z-10">
                    {/* Avatar & Rank */}
                    <div className="relative">
                        <div className={`w-16 h-16 rounded-xl border-2 p-0.5 ${isDuel ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]'}`}>
                            <img src={sender.avatar_url} className="w-full h-full object-cover rounded-lg" alt="Avatar" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-900 rounded-lg border border-white/10 p-1">
                            <img src={invitation.rankIcon} className="w-full h-full object-contain" alt="Rank" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            {isDuel ? <Swords className="w-4 h-4 text-rose-500" /> : <Users className="w-4 h-4 text-cyan-500" />}
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDuel ? 'text-rose-400' : 'text-cyan-400'}`}>
                                {isDuel ? 'Duel Challenge' : 'Multiplayer Invite'}
                            </span>
                        </div>
                        <h3 className="text-sm font-black text-white uppercase truncate">
                            {sender.username}
                        </h3>
                        <p className={`text-[9px] font-bold uppercase tracking-tight opacity-70 ${invitation.rankColor}`}>
                            {invitation.rankName} • {sender.course || '—'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => { playClick(); onAccept(); }}
                            className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/50 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => { playCancel(); onDecline(); }}
                            className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/50 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/20"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Expiry Bar */}
                <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 30, ease: "linear" }}
                    className={`absolute bottom-0 left-0 h-1 ${isDuel ? 'bg-rose-500' : 'bg-cyan-500'}`}
                />
            </div>
        </motion.div>
    );
};

export default InvitationPopup;
