import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Users, Trophy, Clock, Target } from 'lucide-react';

const ArenaBattles = ({ theme }) => {
    // Mock data for 1v1 Battles
    const duelHistory = [
        { id: 'd-1042', p1: 'CyberKnight', p2: 'NullPointer', winner: 'CyberKnight', duration: '4m 12s', time: '2m ago', score: '3-1', p1Avatar: 'https://ui-avatars.com/api/?name=CK&background=0D8ABC&color=fff&size=64', p2Avatar: 'https://ui-avatars.com/api/?name=NP&background=8B5CF6&color=fff&size=64' },
        { id: 'd-1041', p1: 'Alice_Dev', p2: 'Bob_Script', winner: 'Bob_Script', duration: '6m 45s', time: '15m ago', score: '2-1', p1Avatar: 'https://ui-avatars.com/api/?name=AD&background=F59E0B&color=fff&size=64', p2Avatar: 'https://ui-avatars.com/api/?name=BS&background=10B981&color=fff&size=64' },
        { id: 'd-1040', p1: 'VimMaster', p2: 'EmacsLord', winner: 'VimMaster', duration: '12m 30s', time: '42m ago', score: '3-2', p1Avatar: 'https://ui-avatars.com/api/?name=VM&background=EF4444&color=fff&size=64', p2Avatar: 'https://ui-avatars.com/api/?name=EL&background=06B6D4&color=fff&size=64' },
        { id: 'd-1039', p1: 'Junior_1', p2: 'Senior_X', winner: 'Senior_X', duration: '1m 20s', time: '1h ago', score: '3-0', p1Avatar: 'https://ui-avatars.com/api/?name=J1&background=6366F1&color=fff&size=64', p2Avatar: 'https://ui-avatars.com/api/?name=SX&background=EC4899&color=fff&size=64' },
        { id: 'd-1038', p1: 'Rust_Fan', p2: 'Go_Gopher', winner: 'Rust_Fan', duration: '8m 10s', time: '1h 15m ago', score: '2-2 (Timeout)', p1Avatar: 'https://ui-avatars.com/api/?name=RF&background=F97316&color=fff&size=64', p2Avatar: 'https://ui-avatars.com/api/?name=GG&background=14B8A6&color=fff&size=64' },
    ];

    // Mock data for Multiplayer Battles
    const multiplayerHistory = [
        { id: 'm-5021', players: 5, winner: 'Neo_Trinity', duration: '15m 00s', time: '5m ago', winnerAvatar: 'https://ui-avatars.com/api/?name=NT&background=0D8ABC&color=fff&size=64' },
        { id: 'm-5020', players: 3, winner: 'Code_Warrior', duration: '8m 30s', time: '25m ago', winnerAvatar: 'https://ui-avatars.com/api/?name=CW&background=8B5CF6&color=fff&size=64' },
        { id: 'm-5019', players: 4, winner: 'Glitch_Hunter', duration: '10m 15s', time: '1h ago', winnerAvatar: 'https://ui-avatars.com/api/?name=GH&background=10B981&color=fff&size=64' },
        { id: 'm-5018', players: 5, winner: 'System_Ops', duration: '22m 45s', time: '2h ago', winnerAvatar: 'https://ui-avatars.com/api/?name=SO&background=EF4444&color=fff&size=64' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-3xl font-black uppercase italic tracking-wider font-galsb transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Arena Battles</h2>
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] mt-1 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Real-time combat logs & matchmaking oversight</p>
                </div>
                <div className={`p-3 border rounded-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                    <Swords className="w-5 h-5 text-rose-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: 1v1 Battle History */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-6"
                >
                    <div className="flex items-center gap-4 mb-2">
                        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`text-xl font-black italic tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>1v1 Duels</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Individual Combat Logs</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {duelHistory.map((duel, idx) => (
                            <motion.div
                                key={duel.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-5 border rounded-2xl group transition-all cursor-default ${theme === 'dark'
                                    ? 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60 hover:border-orange-500/30'
                                    : 'bg-white border-slate-200 hover:border-orange-500/50 shadow-sm hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>ID: {duel.id}</span>
                                    <span className="text-[10px] font-bold text-slate-500 hidden sm:block">•</span>
                                    <span className="text-[10px] font-bold text-slate-500 hidden sm:block">{duel.time}</span>
                                </div>

                                <div className={`flex items-center justify-between rounded-xl p-3 border transition-colors ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                                    }`}>
                                    <div className={`flex items-center gap-3 ${duel.winner === duel.p1 ? 'opacity-100' : 'opacity-50'}`}>
                                        <img src={duel.p1Avatar} alt={duel.p1} className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
                                        <span className={`text-sm font-bold transition-colors ${duel.winner === duel.p1
                                            ? (theme === 'dark' ? 'text-orange-400' : 'text-orange-600 font-black')
                                            : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
                                            }`}>{duel.p1}</span>
                                        {duel.winner === duel.p1 && <Trophy className="w-3 h-3 text-orange-500 ml-1" />}
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-black italic">VS</span>
                                    <div className={`flex items-center gap-3 flex-row-reverse text-right ${duel.winner === duel.p2 ? 'opacity-100' : 'opacity-50'}`}>
                                        <img src={duel.p2Avatar} alt={duel.p2} className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
                                        <span className={`text-sm font-bold transition-colors ${duel.winner === duel.p2
                                            ? (theme === 'dark' ? 'text-orange-400' : 'text-orange-600 font-black')
                                            : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
                                            }`}>{duel.p2}</span>
                                        {duel.winner === duel.p2 && <Trophy className="w-3 h-3 text-orange-500 mr-1" />}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-end gap-2 text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{duel.duration}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Right Column: Multiplayer Battle History */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-6"
                >
                    <div className="flex items-center gap-4 mb-2">
                        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`text-xl font-black italic tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Multiplayer</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Multiplayer Logs</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {multiplayerHistory.map((match, idx) => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-5 border rounded-2xl group transition-all cursor-default ${theme === 'dark'
                                    ? 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60 hover:border-purple-500/30'
                                    : 'bg-white border-slate-200 hover:border-purple-500/50 shadow-sm hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>ID: {match.id}</span>
                                        <span className="text-[10px] font-bold text-slate-500">•</span>
                                        <span className="text-[10px] font-bold text-slate-500">{match.time}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <h4 className={`text-lg font-black italic tracking-tight transition-colors ${theme === 'dark' ? 'text-white group-hover:text-purple-300' : 'text-slate-900 group-hover:text-purple-600'
                                        }`}>{match.players} Players</h4>
                                </div>

                                <div className={`mt-4 pt-4 border-t flex items-center justify-between transition-colors ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                                    <div className="flex items-center gap-2">
                                        <img src={match.winnerAvatar} alt={match.winner} className="w-10 h-10 rounded-full object-cover border-2 border-white/10" />
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        <span className={`text-xs font-black uppercase tracking-wider transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{match.winner}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{match.duration}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ArenaBattles;
