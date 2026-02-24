import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import heroesIcon from '../../assets/heroes.png';
import achievementIcon from '../../assets/achievement.png';
import dailyRewardsIcon from '../../assets/dailyrewards.png';
import rankingIcon from '../../assets/ranking.png';
import shopIcon from '../../assets/shop.png';
import leaderboardIcon from '../../assets/leaderboard.png';
import gemIcon from '../../assets/gem.png';
import expIcon from '../../assets/exp.png';
import logoutIcon from '../../assets/logoutbutton.png';
import notificationIcon from '../../assets/Notification.png';
import icongame from '../../assets/icongame.png';
import nameLogo from '../../assets/name.png';
import RankingModal from './RankingModal';
import LeaderboardModal from './LeaderboardModal';
import AchievementModal from './AchievementModal';
import DailyRewardsModal from './DailyRewardsModal';
import ShopModal from './ShopModal';
import HeroesModal from './HeroesModal';
import DuelLobbyModal from './DuelLobbyModal';
import MultiplayerLobbyModal from './MultiplayerLobbyModal';
import ProfileModal from './ProfileModal';
import LogoutModal from './LogoutModal';
import NotificationModal from './NotificationModal';
import useSound from '../../hooks/useSound';
import { useMusic } from '../../contexts/MusicContext';
import { useUser } from '../../contexts/UserContext'; // New Context
import supabase from '../../lib/supabase';

const GameNavbar = ({ onLobbyStateChange }) => {
    const navigate = useNavigate();
    const toast = useToast();
    const location = useLocation();
    const { setIsPaused } = useMusic();
    const { user, logout } = useUser(); // Global User Data
    const [isRankingOpen, setIsRankingOpen] = useState(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [isAchievementOpen, setIsAchievementOpen] = useState(false);
    const [isDailyRewardsOpen, setIsDailyRewardsOpen] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isHeroesOpen, setIsHeroesOpen] = useState(false);
    const [isDuelLobbyOpen, setIsDuelLobbyOpen] = useState(false);
    const [isMultiplayerLobbyOpen, setIsMultiplayerLobbyOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const { playClick, playCancel } = useSound();


    // Fetch notification count
    useEffect(() => {
        if (!user?.id) return;
        const fetchCount = async () => {
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false);
            setNotificationCount(count || 0);
        };
        fetchCount();

        // Listen for real-time changes (no server-side filter for RLS compatibility)
        const channel = supabase
            .channel('notif_count')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications'
            }, (payload) => {
                // Client-side filter: only react to changes for this user
                const row = payload.new || payload.old;
                if (row?.receiver_id === user.id) {
                    fetchCount();
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id]);

    // Auto-open lobbies when navigating from arena battle
    useEffect(() => {
        // Small delay to ensure component is fully mounted and state is stable
        const timer = setTimeout(() => {
            const params = new URLSearchParams(location.search);
            const action = params.get('action');

            if (location.state?.openDuelLobby || action === 'openDuelLobby') {
                setIsDuelLobbyOpen(true);
            }
            if (location.state?.openMultiplayerLobby || action === 'openMultiplayerLobby') {
                setIsMultiplayerLobbyOpen(true);
            }
            if (location.state?.openShop) {
                setIsShopOpen(true);
            }

            // Clean up query params if present
            if (action) {
                navigate(location.pathname, { replace: true });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [location, navigate]);

    // Notify parent/context when lobby states change
    useEffect(() => {
        const isAnyLobbyOpen = isDuelLobbyOpen || isMultiplayerLobbyOpen;

        // Update global music pause state
        setIsPaused(isAnyLobbyOpen);

        // Keep legacy prop call if provided (backward compatibility)
        if (onLobbyStateChange) {
            onLobbyStateChange(isAnyLobbyOpen);
        }
    }, [isDuelLobbyOpen, isMultiplayerLobbyOpen, onLobbyStateChange, setIsPaused]);

    const leftSideItems = [
        { icon: achievementIcon, label: 'Achievements' },
        { icon: dailyRewardsIcon, label: 'Daily Rewards' },
        { icon: leaderboardIcon, label: 'Leaderboard' },
    ];

    const bottomRightItems = [
        { icon: heroesIcon, label: 'Heroes' },
        { icon: shopIcon, label: 'Shop' },
        { icon: rankingIcon, label: 'Ranking' },
    ];

    if (!user) return null;

    return (
        <>
            {/* Top Stat Bar */}
            <nav className="fixed top-0 left-0 w-full h-24 flex items-center justify-between px-8 z-50 pointer-events-none">
                {/* Background Gradient & Blur */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                {/* Left: Profile */}
                <div className="flex items-center gap-8 pointer-events-auto z-10">
                    {/* User Profile - Square Shape, Top Left */}
                    <div
                        onClick={() => {
                            playClick();
                            setIsProfileOpen(true);
                        }}
                        className="flex items-center gap-4 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border-2 border-cyan-400/30 flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_rgba(34,211,238,0.2)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all overflow-hidden relative">
                            {/* Global Avatar or Default */}
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center border border-white/10">
                                    <span className="text-xl font-black text-cyan-400 select-none">JD</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            {/* Replaced 'J. Doe' with Rank Name from Context */}
                            <span className="text-sm text-white font-galsb font-bold tracking-wider uppercase leading-none mb-1">
                                {user.name}
                            </span>
                            {/* Replaced 'Level 24' with Rank Name and Icon below it */}
                            {/* Replaced 'Level 24' with Rank Name and Icon below it */}
                            <div className="flex flex-col items-start gap-0.5">
                                <span className="text-xs text-cyan-400 font-galsb font-bold uppercase tracking-tight">
                                    {user.rankName}
                                </span>
                                <div className="w-6 h-6 flex items-center justify-center -ml-1">
                                    <img src={user.rankIcon} alt="Rank" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Branding Logo */}
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto z-10">
                    <img
                        src={nameLogo}
                        alt="Code Siege"
                        className="w-56 h-auto object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                    />
                </div>

                {/* Right: Stats & Logout */}
                <div className="flex items-center gap-12 pointer-events-auto z-10">
                    {/* Stats */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 group nav-item-zoom">
                            <img src={gemIcon} alt="Gems" className="w-12 h-12 object-contain filter drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-cyan-400 font-galsb uppercase leading-tight">Gems</span>
                                <span className="text-lg font-galsb text-white leading-tight tabular-nums">{user.gems?.toLocaleString() || 0}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 group nav-item-zoom">
                            <img src={expIcon} alt="EXP" className="w-12 h-12 object-contain filter drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-amber-400 font-galsb uppercase leading-tight">EXP</span>
                                <span className="text-lg font-galsb text-white leading-tight tabular-nums">{user.exp?.toLocaleString() || (user.level * 2000).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notification */}
                    <button
                        onClick={() => {
                            playClick();
                            setIsNotificationOpen(true);
                        }}
                        className="nav-item-zoom group relative flex items-center justify-center transition-all"
                    >
                        <img
                            src={notificationIcon}
                            alt="Notifications"
                            className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:drop-shadow-[0_0_25px_rgba(34,211,238,0.6)]"
                        />
                        {/* Badge - shows when there are pending notifications */}
                        {notificationCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center animate-pulse">
                                <span className="text-[10px] font-black text-white">{notificationCount}</span>
                            </div>
                        )}
                    </button>

                    {/* Logout - Enlarged */}
                    <button
                        onClick={() => {
                            playClick();
                            setIsLogoutOpen(true);
                        }}
                        className="nav-item-zoom group relative flex items-center justify-center transition-all"
                    >
                        <img
                            src={logoutIcon}
                            alt="Logout"
                            className="w-18 h-18 object-contain drop-shadow-[0_0_20px_rgba(239,68,68,0.3)] group-hover:drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]"
                        />
                    </button>
                </div>
            </nav>

            {/* Left Side: Achievements, Daily Rewards, Leaderboard (Vertical) */}
            <div className="fixed left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-50 pointer-events-auto">
                {leftSideItems.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex flex-col items-center gap-0.5 group nav-item-zoom cursor-pointer"
                        onClick={() => {
                            playClick();
                            if (item.label === 'Leaderboard') {
                                setIsLeaderboardOpen(true);
                            } else if (item.label === 'Achievements') {
                                setIsAchievementOpen(true);
                            } else if (item.label === 'Daily Rewards') {
                                setIsDailyRewardsOpen(true);
                            }
                        }}
                    >
                        <img
                            src={item.icon}
                            alt={item.label}
                            className="w-18 h-18 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_24px_rgba(34,211,238,0.8)] transition-all"
                        />
                        <span className="text-xs text-slate-300 font-galsb font-bold uppercase tracking-widest transition-opacity">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Bottom Right Side: Heroes, Shop, Ranking (Horizontal) */}
            <div className="fixed right-8 bottom-8 flex flex-row items-end gap-2 z-50 pointer-events-auto">
                {bottomRightItems.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex flex-col items-center gap-0.5 group nav-item-zoom cursor-pointer"
                        onClick={() => {
                            playClick();
                            if (item.label === 'Ranking') {
                                setIsRankingOpen(true);
                            } else if (item.label === 'Shop') {
                                setIsShopOpen(true);
                            } else if (item.label === 'Heroes') {
                                setIsHeroesOpen(true);
                            }
                        }}
                    >
                        <img
                            src={item.icon}
                            alt={item.label}
                            className="w-18 h-18 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_24px_rgba(34,211,238,0.8)] transition-all"
                        />
                        <span className="text-xs text-slate-300 font-galsb font-bold uppercase tracking-widest transition-opacity">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            <RankingModal
                isOpen={isRankingOpen}
                onClose={() => setIsRankingOpen(false)}
                onEnterDuel={() => {
                    setIsRankingOpen(false);
                    setIsDuelLobbyOpen(true);
                }}
                onJoinMultiplayer={() => {
                    setIsRankingOpen(false);
                    setIsMultiplayerLobbyOpen(true);
                }}
            />

            <LeaderboardModal
                isOpen={isLeaderboardOpen}
                onClose={() => setIsLeaderboardOpen(false)}
            />

            <AchievementModal
                isOpen={isAchievementOpen}
                onClose={() => setIsAchievementOpen(false)}
            />

            <DailyRewardsModal
                isOpen={isDailyRewardsOpen}
                onClose={() => setIsDailyRewardsOpen(false)}
            />

            <ShopModal
                isOpen={isShopOpen}
                onClose={() => setIsShopOpen(false)}
            />

            <HeroesModal
                isOpen={isHeroesOpen}
                onClose={() => setIsHeroesOpen(false)}
            />

            <DuelLobbyModal
                isOpen={isDuelLobbyOpen}
                onClose={() => setIsDuelLobbyOpen(false)}
                onBack={() => {
                    setIsDuelLobbyOpen(false);
                    setIsRankingOpen(true);
                }}
            />

            <MultiplayerLobbyModal
                isOpen={isMultiplayerLobbyOpen}
                onClose={() => setIsMultiplayerLobbyOpen(false)}
                onBack={() => {
                    setIsMultiplayerLobbyOpen(false);
                    setIsRankingOpen(true);
                }}
            />

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />

            <LogoutModal
                isOpen={isLogoutOpen}
                onClose={() => setIsLogoutOpen(false)}
                onConfirm={async () => {
                    await logout();
                    navigate('/', { state: { loggedOut: true } });
                }}
            />

            <NotificationModal
                isOpen={isNotificationOpen}
                onClose={() => {
                    setIsNotificationOpen(false);
                    // Refresh count when closing
                    if (user?.id) {
                        supabase
                            .from('notifications')
                            .select('*', { count: 'exact', head: true })
                            .eq('receiver_id', user.id)
                            .eq('is_read', false)
                            .then(({ count }) => setNotificationCount(count || 0));
                    }
                }}
            />
        </>
    );
};

export default GameNavbar;
