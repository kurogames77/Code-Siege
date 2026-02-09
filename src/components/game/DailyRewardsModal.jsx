import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Clock, Star } from 'lucide-react';
import dailyRewardsIcon from '../../assets/dailyrewards.png';
import expIcon from '../../assets/exp.png';
import gemIcon from '../../assets/gem.png';
import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext'; // Import ThemeContext

const DailyRewardsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('daily');
    const [claimedTasks, setClaimedTasks] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const { playClick, playCancel, playSelect, playSuccess } = useSound();
    const { currentTheme } = useTheme(); // Use ThemeContext
    const { updateExp, updateGems, user } = useUser(); // Get update functions
    const [rewardPopups, setRewardPopups] = useState([]); // Array of { id, x, y, amount, type }

    // Calculate time until next midnight
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return Math.floor((tomorrow - now) / 1000);
        };

        // Initial set
        const initialTime = calculateTimeLeft();
        setTimeLeft(initialTime);

        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatShortTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // Mock Weekly Progress
    const weeklyScore = 195;
    const maxScore = 800;
    const progressPercent = (weeklyScore / maxScore) * 100;

    // Quest Pool configuration
    const QUEST_POOL = [
        { id: 'q1', title: '[Warmup] Complete 2 match(es).', progress: '0/2', reward: { exp: 35, gold: 25 }, isCompleted: false },
        { id: 'q2', title: '[Triumphant Battle] Win 1 match(es).', progress: '0/1', reward: { exp: 35, gold: 25 }, isCompleted: false },
        { id: 'q3', title: '[Invincible] Complete 2 Ranked match(es).', progress: '0/2', reward: { exp: 40, gold: 40 }, isCompleted: false },
        { id: 'q4', title: '[Game Master] Get a Silver Medal or above 1 time(s).', progress: '0/1', reward: { exp: 30, gold: 20 }, isCompleted: false },
        { id: 'q5', title: '[Team Player] Get 5 Assists in a single match.', progress: '0/5', reward: { exp: 50, gold: 50 }, isCompleted: false },
        { id: 'q6', title: '[Duelist] Win a 1v1 Duel.', progress: '0/1', reward: { exp: 45, gold: 40 }, isCompleted: false },
        { id: 'q7', title: '[Sharpshooter] Deal 5000 damage in a single match.', progress: '0/5000', reward: { exp: 40, gold: 30 }, isCompleted: false },
        { id: 'q8', title: '[Survivor] Survive for 10 minutes in a match.', progress: '0/1', reward: { exp: 30, gold: 20 }, isCompleted: false },
        { id: 'q9', title: '[Collector] Collect 10 items.', progress: '0/10', reward: { exp: 25, gold: 15 }, isCompleted: false },
        { id: 'q10', title: '[Support] Heal 2000 HP in a single match.', progress: '0/2000', reward: { exp: 40, gold: 30 }, isCompleted: false }
    ];

    const generateDailyTasks = () => {
        const today = new Date();
        // Create a unique seed for the day: YYYYMMDD
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

        // Simple seeded random number generator (Linear Congruential Generator)
        let currentSeed = seed;
        const random = () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };

        // Shuffle the pool using the seeded random
        const shuffled = [...QUEST_POOL].sort(() => random() - 0.5);

        // Always include a Login task as the first task
        const loginTask = { id: 'login', title: '[Login] Log in to the game.', progress: '1/1', reward: { exp: 10, gold: 10 }, isCompleted: true }; // Should be completed on load

        // Select 5 random tasks from the pool
        return [loginTask, ...shuffled.slice(0, 5)];
    };


    const [tasks, setTasks] = useState([]);

    // Persist claimed quests key
    const getClaimedKey = () => {
        const today = new Date();
        const dateStr = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        return `daily_claims_${user?.id}_${dateStr}`;
    };

    useEffect(() => {
        setTasks(generateDailyTasks());

        // Load claimed tasks for TODAY
        const savedClaims = localStorage.getItem(getClaimedKey());
        if (savedClaims) {
            setClaimedTasks(JSON.parse(savedClaims));
        } else {
            setClaimedTasks([]);
        }
    }, [user?.id]); // Re-run if user changes (or on mount)


    const addPopup = (x, y, amount, type) => {
        const id = Date.now() + Math.random();
        setRewardPopups(prev => [...prev, { id, x, y, amount, type }]);
        setTimeout(() => {
            setRewardPopups(prev => prev.filter(p => p.id !== id));
        }, 2000);
    };

    const handleClaim = (id, e) => {
        if (!claimedTasks.includes(id)) {
            const task = tasks.find(t => t.id === id);
            if (task && task.isCompleted) {
                const newClaimed = [...claimedTasks, id];
                setClaimedTasks(newClaimed);
                localStorage.setItem(getClaimedKey(), JSON.stringify(newClaimed));

                // Award Rewards
                if (task.reward.exp > 0) {
                    updateExp(task.reward.exp);
                    addPopup(e.clientX, e.clientY, task.reward.exp, 'EXP');
                }
                if (task.reward.gold > 0) {
                    updateGems(task.reward.gold);
                    // Offset slightly for second popup
                    setTimeout(() => addPopup(e.clientX, e.clientY - 30, task.reward.gold, 'GEMS'), 200);
                }
            }
        }
    };


    const handleClaimAll = (e) => {
        const claimable = tasks.filter(t => t.isCompleted && !claimedTasks.includes(t.id));

        if (claimable.length > 0) {
            const ids = claimable.map(t => t.id);
            const newClaimed = [...claimedTasks, ...ids];
            setClaimedTasks(newClaimed);
            localStorage.setItem(getClaimedKey(), JSON.stringify(newClaimed));

            // Calculate total rewards
            let totalExp = 0;
            let totalGems = 0;
            claimable.forEach(t => {
                totalExp += t.reward.exp;
                totalGems += t.reward.gold;
            });

            // Award all at once
            if (totalExp > 0) {
                updateExp(totalExp);
                addPopup(e.clientX, e.clientY, totalExp, 'EXP');
            }
            if (totalGems > 0) {
                updateGems(totalGems);
                setTimeout(() => addPopup(e.clientX, e.clientY - 30, totalGems, 'GEMS'), 200);
            }
        }
    };

    const hasClaimableRewards = tasks.some(t => t.isCompleted && !claimedTasks.includes(t.id));

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel} border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(var(--theme-primary-rgb),0.15)] ring-1 ring-white/5 relative flex font-galsb z-10`}
                    >
                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />
                        {/* Left Sidebar - Navigation */}
                        <div className="w-64 bg-slate-900/80 border-r border-white/5 flex flex-col pt-16 relative z-20">
                            {/* Header Icon */}
                            <div className="absolute top-6 left-6 flex items-center gap-3">
                                <img src={dailyRewardsIcon} alt="Icon" className={`w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(var(--theme-primary-rgb),0.5)]`} />
                                <span className="font-black italic text-white text-lg tracking-tight">DAILY REWARDS</span>
                            </div>

                            <nav className="flex flex-col gap-2 px-4 mt-8">
                                <NavButton active={activeTab === 'rewards'} onClick={() => setActiveTab('rewards')} label="Daily Rewards" subLabel="" theme={currentTheme} />
                                <NavButton active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} label="Daily Quests" subLabel="" theme={currentTheme} />
                            </nav>

                            <div className="mt-auto p-6 opacity-60">
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                                    <Clock className="w-3 h-3" /> Refresh In
                                </div>
                                <div className="text-xl font-black text-white tabular-nums">{formatTime(timeLeft)}</div>
                            </div>
                        </div>



                        {/* Right Panel - Tasks List */}
                        <div className="flex-1 bg-[#131d33] flex flex-col relative">
                            {/* Close Button */}
                            <button
                                onClick={() => { playCancel(); onClose(); }}
                                className="absolute top-8 right-8 p-2.5 bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-90 z-50"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Header Info - Pushed to Right */}
                            <div className="px-8 pt-24 pb-4 flex items-center justify-end pr-20">
                                <div className="flex items-center gap-4">
                                    {/* Coins -> Use Exp Icon */}

                                </div>
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-32 space-y-3">
                                {activeTab === 'daily' ? (
                                    /* Daily Quests List */
                                    tasks.map((task) => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            isClaimed={claimedTasks.includes(task.id)}
                                            onClaim={(e) => handleClaim(task.id, e)}
                                            theme={currentTheme}
                                        />
                                    ))
                                ) : (
                                    /* Daily Login Rewards Grid */
                                    <DailyRewardView theme={currentTheme} onClaimReward={addPopup} userId={user?.id} />
                                )}
                            </div>

                            {/* Reward Popups Layer */}



                            {/* Bottom Fixed Action Bar */}
                            <div className="absolute bottom-0 inset-x-0 h-24 bg-slate-900/90 backdrop-blur-md border-t border-white/5 px-8 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Accumulated EXP: <span className="text-yellow-400 text-sm ml-1">{user?.exp || 0}</span></div>
                                    <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-500 w-[0%]" />
                                    </div>
                                </div>

                                {hasClaimableRewards && (
                                    <div className="flex items-center gap-6">
                                        <button
                                            onClick={(e) => { playSuccess(); handleClaimAll(e); }}
                                            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-yellow-950 font-black uppercase tracking-widest text-sm px-8 py-3 rounded-xl shadow-[0_0_25px_rgba(234,179,8,0.4)] transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            Claim All
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Reward Popups Layer - Moved outside to avoid overflow/transform clipping */}
            <AnimatePresence>
                {rewardPopups.map(popup => (
                    <motion.div
                        key={popup.id}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -50, scale: 1.2 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="fixed pointer-events-none z-[9999] flex items-center gap-2 font-black text-2xl drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                        style={{ left: popup.x, top: popup.y }}
                    >
                        <span className={popup.type === 'EXP' ? 'text-yellow-400' : 'text-purple-400'}>
                            +{popup.amount} {popup.type}
                        </span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </AnimatePresence>
    );
};

// NavButton Component
const NavButton = ({ active, onClick, label, subLabel, hasDot, theme }) => {
    const { playClick } = useSound();
    return (
        <button
            onClick={() => {
                onClick();
                playClick();
            }}
            className={`w-full text-left p-4 rounded-xl transition-all relative overflow-hidden group ${active ? `bg-gradient-to-r from-${theme.colors.primary}-500/20 to-transparent border-l-4 border-${theme.colors.primary}-400` : 'hover:bg-white/5 border-l-4 border-transparent'}`}
        >
            <div className="relative z-10 flex justify-between items-center">
                <span className={`font-bold ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{label}</span>
                {hasDot && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </div>
            {subLabel && <div className={`text-[10px] text-${theme.colors.primary}-400 uppercase tracking-wider mt-1 font-bold`}>{subLabel}</div>}
            {active && <div className={`absolute inset-0 bg-${theme.colors.primary}-400/5 animate-pulse pointer-events-none`} />}
        </button>
    );
};

const ChestBox = ({ active, label, isBig }) => (
    <div className={`flex flex-col items-center gap-2 ${active ? 'opacity-100' : 'opacity-50 grayscale'}`}>
        <div className={`relative group cursor-pointer ${isBig ? 'w-24 h-20' : 'w-20 h-16'}`}>
            <div className={`absolute inset-0 bg-gradient-to-t ${active ? 'from-yellow-500/20' : 'from-slate-500/20'} to-transparent rounded-lg blur-xl group-hover:blur-2xl transition-all`} />
            <div className={`w-full h-full bg-slate-900 border ${active ? 'border-yellow-500/50' : 'border-slate-600/50'} rounded-xl flex items-center justify-center relative z-10 shadow-lg transform group-hover:-translate-y-1 transition-transform`}>
                <Gift className={`${isBig ? 'w-10 h-10' : 'w-8 h-8'} ${active ? 'text-yellow-400' : 'text-slate-500'}`} />
                {active && <div className="absolute inset-0 bg-yellow-400/10 animate-pulse rounded-xl" />}
            </div>
        </div>
        <span className="text-[10px] font-black text-slate-400 bg-black/40 px-2 py-0.5 rounded-full">{label}</span>
    </div>
);

const TaskItem = ({ task, onClaim, isClaimed, theme }) => {
    const { playClick } = useSound();
    return (
        <div className="group relative bg-[#1a2642] hover:bg-[#203054] border border-blue-500/10 hover:border-blue-400/30 rounded-xl p-1 transition-all overflow-hidden">
            <div className="flex items-center p-3 gap-4">
                {/* Left Decor */}
                <div className="w-1 self-stretch bg-blue-500/30 rounded-full" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Star className={`w-3 h-3 text-${theme.colors.primary}-400 fill-${theme.colors.primary}-400`} />
                        <h4 className="text-xs font-bold text-slate-200 truncate pr-4">{task.title}</h4>
                    </div>

                    {/* Rewards Preview */}
                    <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/30 rounded-lg border border-white/5">
                            <img src={expIcon} alt="XP" className="w-6 h-6 object-contain" />
                            <span className="text-[10px] font-bold text-yellow-300">+{task.reward.exp}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 ml-auto mr-4">
                            Progress: <span className={task.isCompleted ? 'text-green-400' : 'text-slate-400'}>
                                {isClaimed || task.isCompleted ? task.progress.split('/')[1] + '/' + task.progress.split('/')[1] : task.progress}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex flex-col items-end gap-2 pl-4 border-l border-white/5">
                    <button
                        onClick={() => {
                            onClaim();
                            playClick();
                        }}
                        disabled={isClaimed || !task.isCompleted}
                        className={`w-28 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all ${isClaimed
                            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                            : task.isCompleted
                                ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-yellow-950 shadow-lg shadow-yellow-500/20 active:scale-95'
                                : 'bg-slate-700/30 text-slate-500 cursor-not-allowed border border-white/5'
                            }`}
                    >
                        {isClaimed ? 'Claimed' : task.isCompleted ? 'Claim' : 'Go'}
                    </button>
                </div>
            </div>

            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        </div>
    );
};

const DailyRewardView = ({ theme, onClaimReward, userId }) => {
    const { playClick } = useSound();
    const { updateExp, updateGems } = useUser();
    const [claimedDays, setClaimedDays] = useState([]);
    const [currentDay, setCurrentDay] = useState(1);
    const [lastClaimDate, setLastClaimDate] = useState(null);

    // Initial Load
    useEffect(() => {
        if (!userId) return;
        const savedData = localStorage.getItem(`daily_login_${userId}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setClaimedDays(parsed.claimedDays || []);
            setCurrentDay(parsed.currentDay || 1); // This is the progress day (e.g. Day 3)
            setLastClaimDate(parsed.lastClaimDate);
        }
    }, [userId]);

    const dailyRewards = [
        { day: 1, reward: 100, icon: expIcon },
        { day: 2, reward: 200, icon: expIcon },
        { day: 3, reward: 400, icon: expIcon },
        { day: 4, reward: 600, icon: expIcon },
        { day: 5, reward: 800, icon: expIcon },
        { day: 6, reward: 1000, icon: expIcon },
        { day: 7, reward: 1000, icon: expIcon, isBig: true },
    ];

    const isClaimableToday = () => {
        if (!lastClaimDate) return true; // First time ever
        const today = new Date().toDateString();
        return lastClaimDate !== today;
    };

    const formatShortTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const handleDayClaim = (day, reward, e) => {
        // Validation:
        // 1. Must be the current progress day
        // 2. Must not have claimed today already
        // 3. Must not be already claimed (sanity check)

        if (day === currentDay && isClaimableToday() && !claimedDays.includes(day)) {
            const today = new Date().toDateString();
            const newClaimed = [...claimedDays, day];

            // Logic: If claimed, next time user comes back NEXT day, it should be currentDay + 1.
            // But visually now, we just mark this day as claimed.
            // We can advance currentDay immediately OR wait for next login. 
            // User request: "it should be claim next when it refreshes"
            // So we stay on Day X (Claimed) for today. Tomorrow it becomes Day X+1 (Unclaimed).

            setClaimedDays(newClaimed);
            setCurrentDay(day + 1); // Advance immediately for visual feedback
            setLastClaimDate(today);

            // Save
            const dataToSave = {
                claimedDays: newClaimed,
                currentDay: day + 1, // Advance progress for NEXT time (but lock it via date check)
                lastClaimDate: today
            };
            localStorage.setItem(`daily_login_${userId}`, JSON.stringify(dataToSave));

            updateExp(reward);
            // Trigger visual effect
            if (onClaimReward) {
                onClaimReward(e.clientX, e.clientY, reward, 'EXP');
            }
        }
    };

    return (
        <div className="grid grid-cols-4 gap-4">
            {dailyRewards.map((item) => {
                const isClaimed = claimedDays.includes(item.day);

                // If we have claimed today (lastClaimDate === today), then currentDay (which was incremented) 
                // is actually the TOMORROW target. So we should view today's claimed item as "Current but Done".
                // Let's rely on simple logic:
                // If item.day < currentDay -> It's a past cleared day.
                // If item.day === currentDay -> It's the active target.
                //      If isClaimableToday() is false, it means we just finished the previous day ?? 
                //      Actually, if we save `day + 1`, then `currentDay` is ALREADY the next day.
                //      So if currentDay = 2, and we claimed today, we want to show Day 1 as Claimed, and Day 2 as Locked (Next).

                // Refined Logic based on saved `currentDay`:
                // If I just claimed Day 1, saved `currentDay` is 2. `lastClaimDate` is Today.
                // So Item 1: day < currentDay (True). isClaimed (True). -> Render Claimed.
                // Item 2: day === currentDay (True). isClaimableToday (False). -> Render Locked/Wait.

                const isPast = item.day < currentDay;
                const isTarget = item.day === currentDay;
                const canClaim = isTarget && isClaimableToday();
                const isLocked = item.day > currentDay || (isTarget && !canClaim);

                return (
                    <div
                        key={item.day}
                        onClick={(e) => {
                            if (canClaim) {
                                handleDayClaim(item.day, item.reward, e);
                                playClick();
                            }
                        }}
                        className={`relative group rounded-2xl p-1 transition-all duration-300 ${item.isBig ? 'col-span-2 row-span-2' : 'col-span-1 aspect-square'} ${isPast || isClaimed ? 'bg-slate-800/50 border border-slate-700 opacity-60' :
                            canClaim ? `bg-gradient-to-br from-${theme.colors.primary}-600 to-${theme.colors.primary}-500 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.4)] cursor-pointer hover:scale-105` :
                                'bg-slate-900/50 border border-white/5 opacity-50'
                            }`}
                    >
                        {/* Background Effect for Active Claimable */}
                        {canClaim && (
                            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-2xl" />
                        )}

                        <div className="h-full w-full bg-slate-900/90 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                            {/* Day Badge */}
                            <div className={`absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${canClaim ? `bg-${theme.colors.primary}-500 text-white` : 'bg-slate-800 text-slate-500'
                                }`}>
                                Day {item.day}
                            </div>

                            {/* Icon */}
                            <div className={`flex flex-col items-center justify-center gap-2 ${item.isBig ? 'scale-125' : ''}`}>
                                <div className="relative">
                                    <img
                                        src={item.icon}
                                        alt="Reward"
                                        className={`object-contain drop-shadow-lg transition-transform duration-500 ${canClaim ? 'w-14 h-14 rotate-12 group-hover:rotate-0' :
                                            item.isBig ? 'w-20 h-20' : 'w-10 h-10 grayscale'
                                            }`}
                                    />
                                    {canClaim && (
                                        <div className={`absolute inset-0 bg-${theme.colors.primary}-400/20 blur-xl animate-pulse`} />
                                    )}
                                </div>
                                <span className={`font-black ${item.isBig ? 'text-2xl text-yellow-400' : 'text-sm text-slate-300'}`}>
                                    +{item.reward} EXP
                                </span>
                            </div>

                            {/* Claimed Overlay */}
                            {(isClaimed || isPast) && (
                                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                                    <div className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider rotate-[-12deg]">
                                        Claimed
                                    </div>
                                </div>
                            )}

                            {/* Next / Locked Overlay */}
                            {isLocked && !isPast && !isClaimed && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    {isTarget ? (
                                        <div className="flex flex-col items-center">
                                            <div className="text-[10px] font-black uppercase text-yellow-500 tracking-widest mb-1">Next Reward</div>
                                            <div className="text-white text-xs font-bold">{formatShortTime(4000)}</div> {/* Mock timer visibility or just "Tomorrow" */}
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                            <div className="w-2 h-2 rounded-full bg-slate-600" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DailyRewardsModal;
