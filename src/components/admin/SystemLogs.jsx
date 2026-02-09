import React, { useState, useEffect } from 'react';
import { Terminal, AlertTriangle, Info, AlertCircle, Search, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { instructorAPI } from '../../services/api';

const SystemLogs = ({ theme = 'dark' }) => {
    const [filter, setFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await instructorAPI.getLogs(page, 50, filter);
            setLogs(data.logs);
            setTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filter]);

    const getLevelStyle = (level) => {
        switch (level) {
            case 'ERROR': return { color: theme === 'dark' ? 'text-rose-500' : 'text-rose-600', bg: theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50', border: theme === 'dark' ? 'border-rose-500/20' : 'border-rose-200', icon: AlertCircle };
            case 'WARN': return { color: theme === 'dark' ? 'text-amber-500' : 'text-amber-600', bg: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50', border: theme === 'dark' ? 'border-amber-500/20' : 'border-amber-200', icon: AlertTriangle };
            case 'INFO': return { color: theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600', bg: theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-50', border: theme === 'dark' ? 'border-cyan-500/20' : 'border-cyan-200', icon: Info };
            default: return { color: theme === 'dark' ? 'text-slate-500' : 'text-slate-600', bg: theme === 'dark' ? 'bg-slate-500/10' : 'bg-slate-50', border: theme === 'dark' ? 'border-slate-500/20' : 'border-slate-200', icon: Terminal };
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden space-y-4">
            {/* Toolbar */}
            <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224]/40 border-white/5 shadow-none' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-cyan-500" />
                        <h2 className={`text-xl font-black uppercase italic tracking-tighter transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>System Logs</h2>
                    </div>

                    <div className="h-6 w-px bg-slate-300/20" />

                    <div className="flex gap-2">
                        {['ALL', 'INFO', 'WARN', 'ERROR'].map(type => (
                            <button
                                key={type}
                                onClick={() => { setFilter(type); setPage(1); }}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${filter === type
                                    ? 'bg-cyan-500 text-white border-cyan-500'
                                    : (theme === 'dark' ? 'bg-slate-900/50 text-slate-500 border-white/5 hover:border-cyan-500/30' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-cyan-500/50')
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className={`p-1.5 rounded-lg border transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-500/10 hover:text-cyan-400'} ${theme === 'dark' ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'}`}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Showing {logs.length} / {total} Events
                </div>
            </div>

            {/* Logs List */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar border rounded-xl backdrop-blur-sm p-2 transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="grid gap-2">
                    <AnimatePresence mode="popLayout">
                        {logs.map((log) => {
                            const style = getLevelStyle(log.level);
                            const Icon = style.icon;
                            return (
                                <motion.div
                                    key={log.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`group grid grid-cols-[140px_100px_140px_1fr] items-center gap-4 p-3 rounded-lg transition-colors border-b last:border-0 ${theme === 'dark' ? 'hover:bg-white/5 border-white/5' : 'hover:bg-slate-50 border-slate-100'}`}
                                >
                                    {/* Timestamp */}
                                    <div className={`flex items-center gap-2 text-xs font-mono transition-colors duration-500 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        <Clock className="w-3 h-3" />
                                        {new Date(log.created_at).toLocaleTimeString()}
                                        <span className="opacity-50">{new Date(log.created_at).toLocaleDateString()}</span>
                                    </div>

                                    {/* Level */}
                                    <div>
                                        <span className={`flex items-center gap-1.5 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.color} ${style.border}`}>
                                            <Icon className="w-3 h-3" />
                                            {log.level}
                                        </span>
                                    </div>

                                    {/* Source */}
                                    <div className={`text-xs font-bold uppercase tracking-wide transition-colors duration-500 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {log.source}
                                    </div>

                                    {/* Message */}
                                    <div className={`text-sm font-mono truncate transition-colors duration-500 ${theme === 'dark' ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                        {log.message}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {logs.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Search className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm font-bold uppercase tracking-widest">No logs found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Load More / Pagination */}
            {logs.length < total && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={() => setPage(p => p + 1)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-slate-900 text-cyan-500 hover:bg-slate-800' : 'bg-slate-100 text-cyan-600 hover:bg-slate-200'}`}
                    >
                        Load More Activity
                    </button>
                </div>
            )}
        </div>
    );
};

export default SystemLogs;
