import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, Users, Database, LogOut, Activity, AlertTriangle, X, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';

const AdminSidebar = ({ activeTab, setActiveTab, theme = 'dark' }) => {
    const navigate = useNavigate();
    const { logout } = useUser();
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const handleExit = async () => {
        await logout();
        navigate('/');
    };

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'instructors', label: 'Instructor Management', icon: Users },
        { id: 'applications', label: 'Applications', icon: ClipboardList },
        { id: 'logs', label: 'System Logs', icon: Database },
        { id: 'security', label: 'Security Protocol', icon: ShieldAlert },
    ];

    return (
        <>
            <div className={`w-80 h-full border-r flex flex-col relative z-20 transition-all duration-500 ${theme === 'dark' ? 'bg-[#020617] border-cyan-500/20' : 'bg-white border-slate-200 shadow-xl'}`}>
                {/* Logo Area */}
                <div className={`p-8 border-b mb-6 transition-colors duration-500 ${theme === 'dark' ? 'border-cyan-500/10' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center animate-pulse transition-colors duration-500 ${theme === 'dark' ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}`}>
                            <ShieldAlert className="w-6 h-6 text-cyan-500" />
                        </div>
                        <div>
                            <h1 className={`text-2xl font-black italic tracking-tighter transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>AD<span className="text-cyan-500">MIN</span></h1>
                            <p className={`text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${theme === 'dark' ? 'text-cyan-500/80' : 'text-cyan-600'}`}>System Control</p>
                        </div>
                    </div>
                </div>

                {/* Menu */}
                <nav className="flex-1 px-6 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group ${isActive
                                    ? (theme === 'dark' ? 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-cyan-50 border border-cyan-200 text-cyan-600 shadow-sm')
                                    : (theme === 'dark' ? 'text-slate-500 hover:text-cyan-400 hover:bg-white/5 border border-transparent' : 'text-slate-400 hover:text-cyan-600 hover:bg-slate-50 border border-transparent')
                                    }`}
                            >
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                                <span className="font-bold text-sm tracking-wide uppercase whitespace-nowrap">{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className={`p-6 border-t transition-colors duration-500 ${theme === 'dark' ? 'border-cyan-500/10' : 'border-slate-100'}`}>
                    <button
                        onClick={() => setShowExitConfirm(true)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all font-bold text-xs uppercase tracking-widest ${theme === 'dark'
                            ? 'bg-cyan-950/10 border-cyan-900/20 text-cyan-700 hover:bg-cyan-950/30 hover:text-cyan-400'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                    >
                        <LogOut className="w-4 h-4" /> Exit Console
                    </button>
                </div>
            </div>

            {/* Exit Confirmation Modal */}
            {showExitConfirm && createPortal(
                <AnimatePresence mode="wait">
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-sm p-6 rounded-2xl border shadow-xl ${theme === 'dark' ? 'bg-[#0B1224] border-cyan-500/20' : 'bg-white border-slate-200'}`}
                        >
                            <div className="flex items-center gap-3 mb-4 text-amber-500">
                                <AlertTriangle className="w-6 h-6" />
                                <h3 className={`text-lg font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Exit Console?</h3>
                            </div>

                            <p className={`mb-6 text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Are you sure you want to terminate the admin session? You will be logged out.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExit}
                                    className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
                                >
                                    Confirm Exit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default AdminSidebar;
