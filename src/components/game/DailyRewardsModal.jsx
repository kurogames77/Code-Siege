import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Clock, Star } from 'lucide-react';
import dailyRewardsIcon from '../../assets/dailyrewards.png';
import expIcon from '../../assets/exp.png';
import gemIcon from '../../assets/gem.png';
import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext'; // Import ThemeContext
import { useQuests } from '../../contexts/QuestContext';

const DailyRewardsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('daily');
    const [timeLeft, setTimeLeft] = useState(0);
    const { playClick, playCancel, playSelect, playSuccess } = useSound();
    const { currentTheme } = useTheme(); // Use ThemeContext
    const { user } = useUser(); // Get update functions
    const { quests = [], claimedQuests = [], claimQuest } = useQuests();
    const [rewardPopups, setRewardPopups] = useState([]); // Array of { id, x, y, amount, type }

    const tasks = quests || []; // Map context quests to local variable for compatibility

    // Debugging duplicate keys
    useEffect(() => {
        if (tasks.length > 0) {
            const ids = tasks.map(t => t.id);
            const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
            if (duplicates.length > 0) {
                console.error("Duplicate Quest IDs found:", duplicates);
            }
            console.log("DailyRewardsModal Tasks:", tasks);
        }
    }, [tasks]);

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


    const addPopup = (x, y, amount, type) => {
        const id = Date.now() + Math.random();
        setRewardPopups(prev => [...prev, { id, x, y, amount, type }]);
        setTimeout(() => {
            setRewardPopups(prev => prev.filter(p => p.id !== id));
        }, 2000);
    };

    const handleClaim = (id, e) => {
        if (!claimedQuests.includes(id)) {
            const reward = claimQuest(id);
            if (reward) {
                // UI Popup
                if (reward.exp > 0) {
                    addPopup(e.clientX, e.clientY, reward.exp, 'EXP');
                }
                if (reward.gold > 0) {
                    // Offset slightly for second popup
                    setTimeout(() => addPopup(e.clientX, e.clientY - 30, reward.gold, 'GEMS'), 200);
                }
            }
        }
    };


    const handleClaimAll = (e) => {
        const claimable = quests.filter(t => t.isCompleted && !claimedQuests.includes(t.id));

        if (claimable.length > 0) {
            let totalExp = 0;
            let totalGems = 0;

            claimable.forEach(t => {
                const reward = claimQuest(t.id);
                if (reward) {
                    totalExp += reward.exp;
                    totalGems += reward.gold;
                }
            });

            // Display accumulated popups
            if (totalExp > 0) {
                addPopup(e.clientX, e.clientY, totalExp, 'EXP');
            }
            if (totalGems > 0) {
                setTimeout(() => addPopup(e.clientX, e.clientY - 30, totalGems, 'GEMS'), 200);
            }
        }
    };

    const hasClaimableRewards = quests.some(t => t.isCompleted && !claimedQuests.includes(t.id));

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
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
                            key="daily-rewards-modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel} border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(var(--theme-primary-rgb),0.15)] ring-1 ring-white/5 relative flex font-galsb z-10`}
                        >
                            {/* Scanline Texture Overlay */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />
                            <div className="w-72 bg-slate-900/80 border-r border-white/5 flex flex-col py-8 relative z-20">
                                {/* Header Icon */}
                                <div className="px-8 mb-8">
                                    <div className="flex items-center gap-4 mb-2">
                                        <img src={dailyRewardsIcon} alt="Icon" className={`w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(var(--theme-primary-rgb),0.5)]`} />
                                        <div>
                                            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter leading-none">
                                                DAILY<br />
                                                <span className={`text-${currentTheme.colors.primary}-500 flex items-center`}>
                                                    REWARDS
                                                    <motion.span
                                                        animate={{ opacity: [1, 0, 1] }}
                                                        transition={{ duration: 0.8, repeat: Infinity }}
                                                        className={`ml-1 w-1.5 h-6 bg-${currentTheme.colors.primary}-500`}
                                                    />
                                                </span>
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 mt-2">
                                        <div className={`w-2 h-2 rounded-full bg-${currentTheme.colors.secondary}-500 animate-pulse`} /> CLAIM LOOT
                                    </div>
                                </div>

                                <nav className="flex flex-col gap-2 px-4">
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
                                        tasks.filter(t => t && t.id).map((task) => {
                                            const isClaimed = claimedQuests.includes(task.id);
                                            // Handle progress display: use context's current/target if available, else fallback
                                            const progressText = task.progress || `${task.current}/${task.target}`;

                                            return (
                                                <motion.div
                                                    key={task.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`relative p-3 rounded-xl border ${task.isCompleted
                                                        ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/30'
                                                        : 'bg-white/5 border-white/10'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <h4 className={`text-sm font-medium ${task.isCompleted ? 'text-emerald-400' : 'text-slate-200'
                                                                }`}>
                                                                {task.title}
                                                            </h4>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <RewardBadge type="exp" value={task.reward.exp} />
                                                                {/* Conditionally render gems if > 0 */}
                                                                {task.reward.gold > 0 && <RewardBadge type="gem" value={task.reward.gold} />}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className={`text-xs font-mono mb-1 ${task.isCompleted ? 'text-emerald-400' : 'text-slate-400'
                                                                }`}>
                                                                Progress: {progressText}
                                                            </span>
                                                            {isClaimed ? (
                                                                <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                                                    <span>CLAIMED</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    disabled={!task.isCompleted}
                                                                    onClick={(e) => handleClaim(task.id, e)}
                                                                    className={`min-w-[80px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${task.isCompleted
                                                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95 animate-pulse'
                                                                        : 'bg-white/5 border border-white/10 text-slate-400 opacity-50 cursor-not-allowed'
                                                                        }`}
                                                                >
                                                                    CLAIM
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar (Visual) */}
                                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 mt-2 rounded-b-xl overflow-hidden">
                                                        <motion.div
                                                            className={`h-full ${task.isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(task.current / task.target) * 100}%` }}
                                                            transition={{ duration: 1, ease: 'easeOut' }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )
                                        })
                                    ) : (
                                        /* Daily Login Rewards Grid */
                                        <DailyRewardView theme={currentTheme} onClaimReward={addPopup} userId={user?.id} timeLeft={timeLeft} />
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
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reward Popups Layer - Moved outside to avoid overflow/transform clipping */}
            < AnimatePresence >
                {
                    rewardPopups.map(popup => (
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
                    ))
                }
            </AnimatePresence >
        </>
    );
};

const RewardBadge = ({ type, value }) => {
    const isExp = type === 'exp';
    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${isExp ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
            <img src={isExp ? expIcon : gemIcon} alt={type} className="w-4 h-4 object-contain" />
            <span className={`text-[10px] font-bold ${isExp ? 'text-yellow-400' : 'text-purple-400'}`}>+{value}</span>
        </div>
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

const DailyRewardView = ({ theme, onClaimReward, userId, timeLeft }) => {
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
                                            <div className="text-white text-xs font-bold">{formatShortTime(timeLeft)}</div>
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
        </div >
    );
};

export default DailyRewardsModal;
