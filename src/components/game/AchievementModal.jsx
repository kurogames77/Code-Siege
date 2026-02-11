import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Lock, CheckCircle, Zap, Target, Shield, Sword, Code, Flame, Bug, Gem, Star, Award, Layers, Hash, Terminal, Database, Globe } from 'lucide-react';
import achievementIcon from '../../assets/achievement.png';
import expIcon from '../../assets/exp.png';
import useSound from '../../hooks/useSound';
import { useTheme } from '../../contexts/ThemeContext'; // Import Theme Context
import gemIcon from '../../assets/gem.png';



// Import Python Badges
import pythonPathfinder from '../../assets/badgesachievements/badgePYTHON/pythoneasy.png';
import pythonEnchanter from '../../assets/badgesachievements/badgePYTHON/pythonintermediate2.png';
import grandSorceres from '../../assets/badgesachievements/badgePYTHON/pythonadvance3.png';

// Import C# Badges
import cshInitiate from '../../assets/badgesachievements/badgeCSHARP/CSHARPeasy1.png';
import cshSpellEngineer from '../../assets/badgesachievements/badgeCSHARP/CSHARPintermediate2.png';
import cshSystemArchitect from '../../assets/badgesachievements/badgeCSHARP/CSHARPadvance3.png';

// Import C++ Badges
import cppForgeAddect from '../../assets/badgesachievements/badgeCPP/cPPeasy1.png';
import cppSystemKnight from '../../assets/badgesachievements/badgeCPP/cPPintermediate2.png';
import cppObsidianMage from '../../assets/badgesachievements/badgeCPP/cPPadvance3.png';

// Import JS Badges
import jsSpark from '../../assets/badgesachievements/badgeJAVASCRIPT/javascripteasy1.png';
import jsConductor from '../../assets/badgesachievements/badgeJAVASCRIPT/javascriptintermediate2.png';
import jsStormArchitect from '../../assets/badgesachievements/badgeJAVASCRIPT/javascriptadvance3.png';

// Import PHP Badges
import phpScribe from '../../assets/badgesachievements/badgePHP/phpeasy1.png';
import phpAlchemist from '../../assets/badgesachievements/badgePHP/phpintermediate2.png';
import phpGransWeaver from '../../assets/badgesachievements/badgePHP/phpadvance3.png';

// Import MySQL Badges
import mysqlDataScribe from '../../assets/badgesachievements/badgeMYSQL/mysqleasy1.png';
import mysqlQueryMaster from '../../assets/badgesachievements/badgeMYSQL/mysqlintermediate2.png';
import mysqlSchemaArchitect from '../../assets/badgesachievements/badgeMYSQL/mysqladvance3.png';

const AchievementModal = ({ isOpen, onClose }) => {
    const { playClick } = useSound();
    const { currentTheme } = useTheme(); // Use Theme Context
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'in_progress', 'locked'

    const categories = [
        { id: 'ALL', label: 'All Realms', icon: <Globe className="w-5 h-5" /> },
        { id: 'PYTHON', label: 'Python', icon: <Terminal className="w-5 h-5" /> },
        { id: 'CSHARP', label: 'C#', icon: <Hash className="w-5 h-5" /> },
        { id: 'CPP', label: 'C++', icon: <Code className="w-5 h-5" /> },
        { id: 'JAVASCRIPT', label: 'JavaScript', icon: <Layers className="w-5 h-5" /> },
        { id: 'PHP', label: 'PHP', icon: <ServerIcon className="w-5 h-5" /> }, // Keeping generic or specific icon
        { id: 'MYSQL', label: 'MySQL', icon: <Database className="w-5 h-5" /> },
    ];

    const achievements = [
        // Python Set
        { id: 1, title: 'Python Pathfinder', description: 'Complete all beginner Python challenges', progress: 0, total: 1, reward: '100 EXP', rewardIcon: expIcon, status: 'locked', image: pythonPathfinder, category: 'PYTHON', gemReward: 2 },
        { id: 2, title: 'Python Enchanter', description: 'Master intermediate Python concepts', progress: 0, total: 10, reward: '500 EXP', rewardIcon: expIcon, status: 'locked', image: pythonEnchanter, category: 'PYTHON', gemReward: 3 },
        { id: 3, title: 'Python Grand Sorceres', description: 'Reach advanced Python mastery', progress: 0, total: 5, reward: '1000 EXP', rewardIcon: expIcon, status: 'locked', image: grandSorceres, category: 'PYTHON', gemReward: 5 },
        // C# Set
        { id: 4, title: 'C# Initiate', description: 'Begin your journey into C# development', progress: 0, total: 1, reward: '150 EXP', rewardIcon: expIcon, status: 'locked', image: cshInitiate, category: 'CSHARP', gemReward: 2 },
        { id: 5, title: 'C# Spell Engineer', description: 'Engineered complex systems in C#', progress: 0, total: 5, reward: '600 EXP', rewardIcon: expIcon, status: 'locked', image: cshSpellEngineer, category: 'CSHARP', gemReward: 4 },
        { id: 6, title: 'C# System Architect', description: 'Master the architecture of C# systems', progress: 0, total: 10, reward: '1200 EXP', rewardIcon: expIcon, status: 'locked', image: cshSystemArchitect, category: 'CSHARP', gemReward: 5 },
        // C++ Set
        { id: 7, title: 'C++ Forge Adept', description: 'Forge your path in the fires of C++', progress: 0, total: 1, reward: '200 EXP', rewardIcon: expIcon, status: 'locked', image: cppForgeAddect, category: 'CPP', gemReward: 3 },
        { id: 8, title: 'C++ System Knight', description: 'Protect the memory safety of C++', progress: 0, total: 5, reward: '700 EXP', rewardIcon: expIcon, status: 'locked', image: cppSystemKnight, category: 'CPP', gemReward: 4 },
        { id: 9, title: 'C++ Obsidian Mage', description: 'Wield the dark magic of low-level optimization', progress: 0, total: 10, reward: '1500 EXP', rewardIcon: <Trophy className="w-3 h-3 text-purple-400" />, status: 'locked', image: cppObsidianMage, category: 'CPP', gemReward: 5 },
        // JavaScript Set
        { id: 10, title: 'JavaScript Spark', description: 'Ignite your web development skills', progress: 0, total: 1, reward: '100 EXP', rewardIcon: expIcon, status: 'locked', image: jsSpark, category: 'JAVASCRIPT', gemReward: 2 },
        { id: 11, title: 'JavaScript Conductor', description: 'Conduct asynchronous flows with ease', progress: 0, total: 5, reward: '500 EXP', rewardIcon: expIcon, status: 'locked', image: jsConductor, category: 'JAVASCRIPT', gemReward: 3 },
        { id: 12, title: 'JavaScript Storm Architect', description: 'Architect complex frontend applications', progress: 0, total: 10, reward: '1000 EXP', rewardIcon: expIcon, status: 'locked', image: jsStormArchitect, category: 'JAVASCRIPT', gemReward: 5 },
        // PHP Set
        { id: 13, title: 'PHP Scribe', description: 'Learn the ancient scrolls of server-side scripting', progress: 0, total: 1, reward: '100 EXP', rewardIcon: expIcon, status: 'locked', image: phpScribe, category: 'PHP', gemReward: 2 },
        { id: 14, title: 'PHP Alchemist', description: 'Transmute data into dynamic web content', progress: 0, total: 5, reward: '500 EXP', rewardIcon: expIcon, status: 'locked', image: phpAlchemist, category: 'PHP', gemReward: 3 },
        { id: 15, title: 'PHP Grand Weaver', description: 'Weave intricate backend systems', progress: 0, total: 10, reward: '1000 EXP', rewardIcon: expIcon, status: 'locked', image: phpGransWeaver, category: 'PHP', gemReward: 5 },
        // MySQL Set
        { id: 16, title: 'MySQL Data Scribe', description: 'Record information in the digital archives', progress: 0, total: 1, reward: '120 EXP', rewardIcon: expIcon, status: 'locked', image: mysqlDataScribe, category: 'MYSQL', gemReward: 2 },
        { id: 17, title: 'MySQL Query Master', description: 'Search through the archives with efficiency', progress: 0, total: 5, reward: '600 EXP', rewardIcon: expIcon, status: 'locked', image: mysqlQueryMaster, category: 'MYSQL', gemReward: 3 },
        { id: 18, title: 'MySQL Schema Architect', description: 'Design the foundations of database structures', progress: 0, total: 10, reward: '1200 EXP', rewardIcon: expIcon, status: 'locked', image: mysqlSchemaArchitect, category: 'MYSQL', gemReward: 5 }
    ];

    const filteredAchievements = achievements.filter(a => {
        const matchesCategory = selectedCategory === 'ALL' || a.category === selectedCategory;
        const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
        return matchesCategory && matchesStatus;
    });

    // Variants for container stagger
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    // Variants for items
    const itemVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    {/* Background Visuals */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,#000000_100%)] opacity-40" />
                        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
                            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                        {/* Scanning Bar Effect */}
                        <motion.div
                            animate={{ top: ['-10%', '110%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className={`absolute left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-${currentTheme.colors.primary}-500/10 to-transparent pointer-events-none z-10`}
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                        className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel} border border-${currentTheme.colors.primary}-500/20 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(var(--theme-primary-rgb),0.15)] flex relative font-galsb`}
                    >
                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />

                        {/* Background Decoration */}
                        <div className={`absolute top-0 right-0 w-96 h-96 bg-${currentTheme.colors.primary}-600/5 rounded-full blur-[120px] pointer-events-none z-0`} />
                        <div className={`absolute bottom-0 left-0 w-96 h-96 bg-${currentTheme.colors.secondary}-600/5 rounded-full blur-[120px] pointer-events-none z-0`} />

                        {/* Sidebar */}
                        <div className="w-72 bg-[#0F172A]/80 backdrop-blur-md border-r border-white/5 flex flex-col py-8 z-10 relative">
                            {/* Header Logo Area */}
                            <div className="px-8 mb-10 flex items-center gap-4">
                                <div className="relative group">
                                    <div className={`absolute inset-0 bg-${currentTheme.colors.primary}-500/30 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity`} />
                                    <img src={achievementIcon} alt="Icon" className="w-12 h-12 relative z-10 drop-shadow-lg" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic tracking-tighter leading-none">
                                        ACHIEVEMENTS
                                        <br />
                                        <span className={`text-${currentTheme.colors.primary}-400 flex items-center`}>
                                            AWARDS
                                            <motion.span
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{ duration: 0.8, repeat: Infinity }}
                                                className={`ml-1 w-1.5 h-5 bg-${currentTheme.colors.primary}-500`}
                                            />
                                        </span>
                                    </h2>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full bg-${currentTheme.colors.secondary}-500 animate-pulse`} /> UNLOCK BADGES
                                    </div>
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
                                <h3 className="px-4 text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Languages</h3>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            playClick();
                                        }}
                                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all relative group overflow-hidden ${selectedCategory === cat.id
                                            ? 'text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {selectedCategory === cat.id && (
                                            <motion.div
                                                layoutId="activeCategory"
                                                className={`absolute inset-0 bg-gradient-to-r from-${currentTheme.colors.primary}-500/20 to-transparent border-l-2 border-${currentTheme.colors.primary}-400`}
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        <div className={`relative z-10 ${selectedCategory === cat.id ? `text-${currentTheme.colors.primary}-400` : 'text-slate-500 group-hover:text-slate-300'}`}>
                                            {cat.icon}
                                        </div>
                                        <span className="relative z-10 text-sm font-bold uppercase tracking-wider">{cat.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Sidebar Footer Stats */}
                            <div className="mx-6 mt-6 p-4 bg-black/20 rounded-2xl border border-white/5">
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Progress</div>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                                    <div className="w-[0%] h-full bg-gradient-to-r from-amber-400 to-orange-500" />
                                </div>
                                <div className="flex justify-between text-xs font-mono text-slate-400">
                                    <span>0/18</span>
                                    <span>0%</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col relative z-20 overflow-hidden">
                            {/* Top Bar */}
                            <div className="h-24 px-10 border-b border-white/5 flex items-center justify-between bg-[#0F172A]/30 backdrop-blur-sm shrink-0">
                                <div>
                                    <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                        {categories.find(c => c.id === selectedCategory)?.label}
                                    </h1>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Track your mastery and claim rewards.</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Filter Tabs */}
                                    <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                                        {['all', 'completed', 'in_progress', 'locked'].map((f) => {
                                            const isActive = filterStatus === f;
                                            return (
                                                <button
                                                    key={f}
                                                    onClick={() => {
                                                        setFilterStatus(f);
                                                        playClick();
                                                    }}
                                                    className={`relative px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? `text-${currentTheme.colors.primary}-950` : 'text-slate-400 hover:text-slate-200'
                                                        }`}
                                                >
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="activeFilterMain"
                                                            className={`absolute inset-0 bg-${currentTheme.colors.primary}-400 shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.4)] rounded-lg`}
                                                            initial={false}
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        />
                                                    )}
                                                    <span className="relative z-10">{f.replace('_', ' ')}</span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <button
                                        onClick={() => {
                                            onClose();
                                            playClick();
                                        }}
                                        className="w-12 h-12 flex items-center justify-center bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-180"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Achievement Grid */}
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <motion.div
                                    className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="show"
                                    key={selectedCategory + filterStatus} // Force re-animate on switch
                                >
                                    {filteredAchievements.length > 0 ? (
                                        filteredAchievements.map((achievement) => {
                                            const isLocked = achievement.status === 'locked';
                                            const isCompleted = achievement.status === 'completed';
                                            const inProgress = achievement.status === 'in_progress';

                                            return (
                                                <motion.div
                                                    key={achievement.id}
                                                    variants={itemVariants}
                                                    className={`group relative aspect-[4/5] rounded-3xl overflow-hidden transition-all duration-300 ${isCompleted
                                                        ? `bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-${currentTheme.colors.primary}-500/30`
                                                        : isLocked
                                                            ? 'bg-slate-900/40 border border-white/5 grayscale opacity-60'
                                                            : 'bg-slate-800/40 border border-amber-500/20'
                                                        }`}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />

                                                    {/* Completed Checkmark Background */}
                                                    {isCompleted && (
                                                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden">
                                                            <CheckCircle className="w-56 h-56 text-green-500/10 rotate-12 transform translate-y-4" strokeWidth={1.5} />
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="absolute inset-0 z-20 p-5 flex flex-col items-center text-center">
                                                        {/* Reward Tag */}
                                                        {/* Reward Tags */}
                                                        <div className="flex justify-center gap-2 mb-2 w-full">
                                                            <div className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isCompleted ? `bg-${currentTheme.colors.primary}-950 text-${currentTheme.colors.primary}-400 border border-${currentTheme.colors.primary}-500/20` : 'bg-slate-950 text-slate-500 border border-white/5'
                                                                }`}>
                                                                {typeof achievement.rewardIcon === 'string' ? (
                                                                    <img src={achievement.rewardIcon} className="w-4 h-4 object-contain" alt="reward" />
                                                                ) : (
                                                                    achievement.rewardIcon
                                                                )}
                                                                {achievement.reward}
                                                            </div>
                                                            {achievement.gemReward && (
                                                                <div className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isCompleted ? `bg-${currentTheme.colors.primary}-950 text-${currentTheme.colors.primary}-400 border border-${currentTheme.colors.primary}-500/20` : 'bg-slate-950 text-slate-500 border border-white/5'
                                                                    }`}>
                                                                    <img src={gemIcon} className="w-4 h-4 object-contain" alt="gem" />
                                                                    {achievement.gemReward}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Image */}
                                                        <div className="flex-1 w-full flex items-center justify-center relative">
                                                            <div className={`w-32 h-32 transition-transform duration-500 group-hover:scale-110 ${isLocked ? 'grayscale opacity-50' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}>
                                                                <img src={achievement.image} alt={achievement.title} className="w-full h-full object-contain" />
                                                            </div>
                                                            {isLocked && <Lock className="absolute w-8 h-8 text-slate-500/50" />}
                                                        </div>

                                                        {/* Text */}
                                                        <div className="w-full mt-4">
                                                            {/* Title */}
                                                            <h3 className={`text-sm font-black uppercase leading-tight mb-1 ${isCompleted ? `text-${currentTheme.colors.primary}-300` : isLocked ? 'text-slate-600' : 'text-amber-400'
                                                                }`}>
                                                                {achievement.title}
                                                            </h3>

                                                            {/* Progress Bar - Only for in-progress achievements */}
                                                            {inProgress && (
                                                                <div className="w-full mb-2">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-[8px] font-bold text-amber-400/80 uppercase tracking-wider">
                                                                            {achievement.progress}/{achievement.total}
                                                                        </span>
                                                                        <span className="text-[8px] font-black text-amber-400">
                                                                            {Math.round((achievement.progress / achievement.total) * 100)}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-amber-500/20">
                                                                        <motion.div
                                                                            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Description */}
                                                            <p className={`text-[10px] leading-snug mb-auto ${isCompleted ? 'text-slate-400' : isLocked ? 'text-slate-700' : 'text-slate-400'
                                                                }`}>
                                                                {achievement.description}
                                                            </p></div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600">
                                            <Shield className="w-16 h-16 mb-4 opacity-20" />
                                            <p className="text-sm font-black uppercase tracking-widest">No achievements found</p>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Helper for generic icon
const ServerIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" /></svg>
)

export default AchievementModal;
