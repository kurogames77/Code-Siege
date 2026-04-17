import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import AdminSidebar from '../components/admin/AdminSidebar';
import { AnimatePresence, motion } from 'framer-motion';
import { Sun, Moon, CreditCard, Bell } from 'lucide-react';

import AdminDashboard from '../components/admin/AdminDashboard';
import InstructorManagement from '../components/admin/InstructorManagement';
import InstructorApplications from '../components/admin/InstructorApplications';
import SystemLogs from '../components/admin/SystemLogs';
import StudentCodesManager from '../components/admin/StudentCodesManager';
import StudentManagement from '../components/admin/StudentManagement';
import GuestManagement from '../components/admin/GuestManagement';
import ManualPayments from '../components/admin/ManualPayments';

const AdminPage = () => {
    const { user, isAuthenticated, loading } = useUser();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                // Use setTimeout to allow child components (like InstructorSidebar) to handle 
                // intentional navigation (e.g. logout) before this forced redirect kicks in.
                const timer = setTimeout(() => {
                    navigate('/', { state: { openLogin: true } });
                }, 0);
                return () => clearTimeout(timer);
            } else if (user?.role !== 'admin') {
                navigate('/'); // Redirect unauthorized users to home
            }
        }
    }, [loading, isAuthenticated, user, navigate]);

    if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-500">Loading Console...</div>;

    // Strict Access Control
    if (!isAuthenticated || user?.role !== 'admin') return null;

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <AdminDashboard theme={theme} />;
            case 'instructors':
                return <InstructorManagement theme={theme} />;
            case 'students':
                return <StudentManagement theme={theme} />;
            case 'applications':
                return <InstructorApplications theme={theme} />;
            case 'codes':
                return <StudentCodesManager theme={theme} />;
            case 'guests':
                return <GuestManagement theme={theme} />;
            case 'payments':
                return <ManualPayments theme={theme} />;
            case 'logs':
                return <SystemLogs theme={theme} />;
            case 'security':
                return (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-cyan-500/50">
                        <div className="text-4xl mb-4">🛡️</div>
                        <h3 className="text-xl font-black uppercase italic tracking-widest"> Security Protocols</h3>
                        <p className="text-xs font-bold uppercase tracking-widest mt-2">{`< FIREWALL ACTIVE >`}</p>
                    </div>
                );
            default:
                return <AdminDashboard theme={theme} />;
        }
    };

    return (
        <div className={`flex h-screen transition-colors duration-500 overflow-hidden relative selection:bg-cyan-500/30 ${theme === 'dark' ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Background Texture */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className={`absolute inset-0 transition-opacity duration-700 ${theme === 'dark' ? 'opacity-[0.03]' : 'opacity-[0.05]'}`}
                    style={{ backgroundImage: theme === 'dark' ? 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)' : 'radial-gradient(circle at 2px 2px, #06b6d4 1px, transparent 0)', backgroundSize: '50px 50px' }}
                />
            </div>

            {/* Sidebar */}
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
                {/* Header with Tool Icons and Theme Toggle */}
                <header className={`h-20 flex items-center justify-end px-12 gap-4 z-20 transition-colors duration-500 ${theme === 'dark' ? 'bg-transparent' : 'bg-white/50 backdrop-blur-md border-b border-slate-200'}`}>
                    
                    {/* Payment Verification Icon */}
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center group/payment ${
                            activeTab === 'payments'
                                ? (theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'bg-emerald-50 border-emerald-500 text-emerald-600')
                                : (theme === 'dark' ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-emerald-400 hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'bg-white border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-500 shadow-sm')
                        }`}
                        title="Payment Verification"
                    >
                        <CreditCard className={`w-5 h-5 transition-transform duration-500 ${activeTab === 'payments' ? '' : 'group-hover/payment:scale-110'}`} />
                    </button>

                    {/* Actions Notification Icon */}
                    <button
                        className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center group/notif ${theme === 'dark'
                            ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-cyan-500 hover:text-cyan-500 shadow-sm'
                            }`}
                        title="Notifications"
                    >
                        <Bell className="w-5 h-5 group-hover/notif:scale-110 transition-transform duration-500" />
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-slate-900 animate-ping" />
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-slate-900" />
                    </button>

                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center group/theme ${theme === 'dark'
                            ? 'bg-slate-900 border-white/5 text-yellow-400 hover:border-yellow-400/50 hover:shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-500 hover:text-cyan-500 shadow-sm'
                            }`}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 group-hover/theme:rotate-90 transition-transform duration-500" />
                        ) : (
                            <Moon className="w-5 h-5 group-hover/theme:-rotate-12 transition-transform duration-500" />
                        )}
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AdminPage;
