import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import InstructorSidebar from '../components/instructor/InstructorSidebar';
import InstructorDashboard from '../components/instructor/InstructorDashboard';
import PuzzleCourses from '../components/instructor/PuzzleCourses';
import Certificate from '../components/instructor/Certificate';
import { Search, Bell, User, Sun, Moon } from 'lucide-react';

const InstructorPage = () => {
    const { isAuthenticated, loading, user } = useUser();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        if (!loading && (!isAuthenticated || (user && user.role !== 'instructor' && user.role !== 'admin'))) {
            navigate('/');
        }
    }, [isAuthenticated, loading, user, navigate]);

    if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center text-cyan-500">Initializing Terminal...</div>;
    if (!isAuthenticated) return null;

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <InstructorDashboard theme={theme} />;
            case 'courses':
                return <PuzzleCourses theme={theme} />;

            case 'certificate':
                return <Certificate theme={theme} />;
            default:
                return <InstructorDashboard theme={theme} />;
        }
    };

    return (
        <div
            className={`flex h-screen transition-colors duration-500 overflow-hidden font-inter selection:bg-cyan-500/30 selection:text-cyan-200 ${theme === 'dark' ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-900'
                }`}
            style={{ '--scrollbar-thumb': theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
            {/* Sidebar */}
            <InstructorSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                theme={theme}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Top Terminal Bar */}
                <header className={`h-20 border-b flex items-center justify-between px-10 shrink-0 z-10 transition-colors duration-500 ${theme === 'dark' ? 'border-white/5 bg-[#0B1224]/30 backdrop-blur-md' : 'border-slate-200 bg-white shadow-sm'
                    }`}>
                    <div className="flex items-center gap-8 flex-1 max-w-2xl text-slate-500">
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Theme Toggle */}
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


                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
                    {/* Background Grid Pattern */}
                    <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700 ${theme === 'dark' ? 'opacity-[0.03]' : 'opacity-[0.05]'}`}>
                        <div className="absolute inset-0" style={{
                            backgroundImage: theme === 'dark'
                                ? 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)'
                                : 'radial-gradient(circle at 2px 2px, #06b6d4 1px, transparent 0)',
                            backgroundSize: '40px 40px'
                        }} />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="relative z-10"
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default InstructorPage;
