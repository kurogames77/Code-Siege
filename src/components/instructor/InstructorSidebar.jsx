import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Swords,
    Shield,
    Settings,
    LogOut,
    Menu,
    ChevronLeft,
    Terminal,
    BarChart3,
    Award,
    UserCircle,
    Crown
} from 'lucide-react';
import gameIcon from '../../assets/icongame.png';
import rankingIcon from '../../assets/ranking.png';
import EditInstructorProfileModal from './EditInstructorProfileModal';
import LogoutConfirmationModal from './LogoutConfirmationModal';

const InstructorSidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, theme }) => {
    const navigate = useNavigate();
    const { user, logout } = useUser();
    const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false);

    const handleSignOut = () => {
        setIsLogoutConfirmOpen(true);
    };

    const handleConfirmLogout = async () => {
        try {
            await logout();
            navigate('/', { state: { loggedOut: true } });
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/');
        }
    };

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'courses', label: 'Puzzle Courses', icon: BookOpen },
        { id: 'certificate', label: 'Certificate', icon: Award },
    ];

    return (
        <>
            <motion.div
                initial={false}
                animate={{ width: isCollapsed ? 100 : 300 }}
                className={`h-full border-r flex flex-col relative overflow-visible flex-shrink-0 z-20 transition-all duration-300 ${theme === 'dark'
                    ? 'bg-[#0B1224]/80 backdrop-blur-2xl border-white/5'
                    : 'bg-white border-slate-200 shadow-[20px_0_40px_rgba(0,0,0,0.02)]'
                    }`}
            >
                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`absolute left-full top-20 w-8 h-12 rounded-r-xl flex items-center justify-center text-white z-50 hover:scale-110 active:scale-95 transition-all duration-300 group/collapse ${theme === 'dark'
                        ? 'bg-cyan-500 shadow-[2px_0_10px_rgba(6,182,212,0.3)] hover:bg-rose-500'
                        : 'bg-cyan-600 shadow-lg hover:bg-rose-600'
                        }`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <motion.div
                        animate={{ rotate: isCollapsed ? 180 : 0 }}
                        transition={{ duration: 0.5, ease: "anticipate" }}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.div>

                    {/* Visual Indicator of the edge */}
                    <div className={`absolute inset-y-2 left-0 w-0.5 rounded-full transition-colors ${theme === 'dark' ? 'bg-white/20 group-hover/collapse:bg-white/40' : 'bg-black/10 group-hover/collapse:bg-white/20'
                        }`} />
                </button>

                {/* Logo Section */}
                <div className={`p-8 pb-10 flex flex-col ${isCollapsed ? 'items-center' : 'items-start'} transition-all duration-300`}>
                    <div className="flex items-center gap-3">
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 1 }}
                                className={`text-2xl font-black uppercase italic tracking-tighter font-galsb transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                            >
                                CODE
                            </motion.span>
                        )}

                        <div className="relative shrink-0">
                            <img src={gameIcon} alt="Logo" className="w-10 h-10 object-contain" />
                        </div>

                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 1 }}
                                className="text-2xl font-black text-[#A855F7] uppercase italic tracking-tighter font-galsb"
                            >
                                SIEGE
                            </motion.span>
                        )}
                    </div>

                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            className="mt-2"
                        >
                            <h1 className={`text-xs font-black uppercase tracking-[0.4em] leading-none whitespace-nowrap transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Instructor Terminal</h1>
                        </motion.div>
                    )}
                </div>


                {/* Profile Section */}
                <div className={`px-4 mb-6 transition-all duration-300 ${isCollapsed ? 'items-center' : ''}`}>
                    <div
                        onClick={() => setIsEditProfileOpen(true)}
                        className={`p-4 rounded-[1.5rem] transition-all duration-500 overflow-hidden cursor-pointer group/profile ${theme === 'dark'
                            ? 'bg-slate-900/40 hover:bg-slate-900/80 border border-transparent hover:border-cyan-500/30'
                            : 'bg-slate-50 hover:bg-white hover:shadow-md hover:border-cyan-200'
                            }`}>
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                                {user?.avatar ? (
                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-500/30">
                                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${theme === 'dark'
                                        ? 'bg-cyan-500/10 border-cyan-500/30 group-hover/profile:bg-cyan-500/20 group-hover/profile:border-cyan-400/50'
                                        : 'bg-white border-cyan-100 group-hover/profile:border-cyan-300'
                                        }`}>
                                        <UserCircle className={`w-6 h-6 transition-colors ${theme === 'dark' ? 'text-cyan-400 group-hover/profile:text-cyan-300' : 'text-cyan-600'}`} />
                                    </div>
                                )}

                            </div>

                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="overflow-hidden"
                                >
                                    <h4 className={`text-xs font-black italic tracking-tight truncate transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        {user?.name || 'Instructor'}
                                    </h4>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-cyan-400/80' : 'text-cyan-600'}`}>
                                            INSTRUCTOR
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 overflow-x-hidden custom-scrollbar">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full group/item flex items-center gap-4 p-4 rounded-2xl transition-all relative overflow-hidden ${isActive
                                    ? (theme === 'dark' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600 shadow-sm border border-cyan-100')
                                    : (theme === 'dark' ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50')
                                    }`}
                            >
                                {isActive && theme === 'dark' && (
                                    <motion.div
                                        layoutId="activeGlow"
                                        className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-none"
                                    />
                                )}
                                <Icon className={`w-6 h-6 shrink-0 transition-colors ${isActive
                                    ? (theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600')
                                    : (theme === 'dark' ? 'text-slate-500 group-hover/item:text-slate-300' : 'text-slate-400 group-hover/item:text-slate-900')
                                    }`} />
                                {!isCollapsed && (
                                    <span className={`font-bold text-sm tracking-wide whitespace-nowrap transition-colors ${isActive
                                        ? (theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600 font-black')
                                        : (theme === 'dark' ? 'text-slate-500 group-hover/item:text-slate-300' : 'text-slate-500 group-hover/item:text-slate-900')
                                        }`}>{item.label}</span>
                                )}

                                {/* Hover Tooltip for Collapsed State */}
                                {isCollapsed && (
                                    <div className={`fixed left-24 px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity z-[100] shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                                        }`}>
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className={`p-4 border-t space-y-2 transition-colors duration-500 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                    <button
                        onClick={handleSignOut}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group/logout ${theme === 'dark'
                            ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/5'
                            : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                    >
                        <LogOut className="w-6 h-6 shrink-0" />
                        {!isCollapsed && <span className="font-bold text-sm tracking-wide">Sign Out</span>}
                    </button>

                </div>
            </motion.div>
            <EditInstructorProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
            />
            <LogoutConfirmationModal
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={handleConfirmLogout}
            />
        </>
    );
};

export default InstructorSidebar;
