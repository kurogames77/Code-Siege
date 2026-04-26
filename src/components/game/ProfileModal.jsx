import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Trophy, Medal, Target, Swords, User, Users, UserMinus, History, Settings, Info, Image as ImageIcon, CheckCircle2, XCircle, Clock, Book, Bell, Lock, Globe, Edit, Save, Award, Download, Palette, Circle, KeyRound, Loader } from 'lucide-react';


import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { userAPI, battlesAPI, leaderboardAPI } from '../../services/api';
import { RANKS, getRankFromExp } from '../../utils/rankSystem';
import supabase from '../../lib/supabase';
import heroAsset from '../../assets/hero1.png';
import hero1aStatic from '../../assets/hero1a.png';
import hero2Static from '../../assets/hero2.png';
import hero3Static from '../../assets/hero3.png';
import hero4Static from '../../assets/hero4.png';
import icongame from '../../assets/icongame.png';
import jrmsulogo from '../../assets/jrmsulogo.png';
import ccslogo from '../../assets/ccslogo.png';
import gamecodebg from '../../assets/gamecodebg.jpg';
import christmasTheme from '../../assets/christmas_theme_bundle.png';
import halloweenTheme from '../../assets/halloween_theme_bundle.png';
import winterTheme from '../../assets/winter_theme_bundle.png';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user, updateAvatar, updateProfile, onlineUserIds } = useUser();
    const { currentTheme, setTheme, themes } = useTheme(); // Destructure all needed values
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const [friendsList, setFriendsList] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [stats, setStats] = useState({ winnings: 0, losses: 0, winRate: '0%' });
    const [matchHistory, setMatchHistory] = useState([]);
    const [leaderboardRank, setLeaderboardRank] = useState(null);
    
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [isFriendViewerOpen, setIsFriendViewerOpen] = useState(false);
    const [isFriendLoading, setIsFriendLoading] = useState(false);
    const [friendToRemove, setFriendToRemove] = useState(null);

    const confirmUnfriend = async () => {
        if (!friendToRemove) return;
        try {
            await userAPI.removeFriend(friendToRemove.id);
            toast.success('Friend removed');
            setFriendsList(prev => prev.filter(f => f.id !== friendToRemove.id));
            playSuccess();
        } catch (err) {
            console.error("Failed to unfriend", err);
            toast.error('Failed to remove friend');
            playCancel();
        } finally {
            setFriendToRemove(null);
        }
    };

    // Fetch battle stats and leaderboard rank on mount
    useEffect(() => {
        if (!isOpen) return;
        battlesAPI.getHistory().then(data => {
            const history = Array.isArray(data) ? data : (data?.battles || []);
            // Only include completed battles
            const completedBattles = history.filter(b => b.status === 'completed' && b.winner_id);
            const wins = completedBattles.filter(b => b.winner_id === user?.id).length;
            const total = completedBattles.length;
            const losses = total - wins;
            const winRate = total > 0 ? `${Math.round((wins / total) * 100)}%` : '0%';
            setStats({ winnings: wins, losses, winRate });

            // Build display-ready match history from completed battles
            const formatted = completedBattles.map(b => {
                const isWin = b.winner_id === user?.id;
                // Find opponent name(s)
                const players = [b.player1, b.player2, b.player3, b.player4, b.player5].filter(Boolean);
                const opponents = players.filter(p => p?.id !== user?.id).map(p => p?.username || 'Unknown');
                const opponentStr = opponents.length > 0 ? opponents.join(', ') : 'Unknown';
                const date = b.completed_at || b.created_at;
                const timeStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown';
                return {
                    id: b.id,
                    mode: b.mode || '1v1 Duel',
                    result: isWin ? 'Win' : 'Loss',
                    time: timeStr,
                    hero: opponentStr,
                    outcome: isWin ? 'Victory' : 'Defeat'
                };
            });
            setMatchHistory(formatted);
        }).catch(() => { });

        // Fetch leaderboard rank for the current user
        leaderboardAPI.getAll(200).then(data => {
            if (data?.userRank) {
                setLeaderboardRank(data.userRank);
            } else if (data?.leaderboard && user?.id) {
                // Fallback: find the user in the leaderboard array
                const entry = data.leaderboard.find(u => u.id === user.id);
                setLeaderboardRank(entry?.rank || null);
            }
        }).catch(() => { });
    }, [isOpen, user?.id]);
    const fileInputRef = useRef(null);
    const { playClick, playCancel, playSelect, playSuccess } = useSound();
    const toast = useToast();



    // Hero selection logic
    const selectedHeroId = localStorage.getItem('selectedHeroId') || '4';
    const heroInfoMap = {
        '1': { name: 'Ignis', image: hero3Static },
        '2': { name: 'Daemon', image: hero4Static },
        '3': { name: 'Valerius', image: hero1aStatic },
        '4': { name: 'Nyx', image: hero2Static }
    };
    const activeHero = heroInfoMap[selectedHeroId] || heroInfoMap['4'];

    const handleEditClick = () => {
        setEditForm({
            name: user.name,
            gender: user.gender,
            course: user.course,
            email: user.email
        });
        setIsEditing(true);
        playClick();
    };

    const handleSaveProfile = () => {
        updateProfile(editForm);
        setIsEditing(false);
        playSuccess();
    };

    const compressImage = (file, maxWidth = 400, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height *= maxWidth / width));
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width = Math.round((width *= maxWidth / height));
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        // Create a new File from the blob
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                            type: 'image/webp',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    }, 'image/webp', quality);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (e.g. 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image too large. Max 5MB.');
                return;
            }

            setIsUploading(true);
            try {
                // Compress the image to a small WebP before uploading to save massive data and time
                const compressedFile = await compressImage(file, 400, 0.8);
                await updateAvatar(compressedFile);
                toast.success('Profile picture updated!');
                playSuccess();
            } catch (error) {
                console.error('Upload failed:', error);
                toast.error('Failed to update profile picture.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
        { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
        { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
        { id: 'collection', label: 'Collection', icon: <ImageIcon className="w-4 h-4" /> },
        { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4" /> },
        { id: 'themes', label: 'Themes', icon: <Palette className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    ];

    // matchHistory is now a state variable populated by the useEffect above

    const collection = [];

    const userCertificates = [];


    const renderProfileContent = () => (
        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
            {/* Top Section: Basic Info */}
            <div className="flex items-start gap-8 mb-12">
                {/* Profile Pic with Upload */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <div className={`w-32 h-32 rounded-2xl ${currentTheme.colors.panel} border-2 ${currentTheme.colors.border} overflow-hidden shadow-2xl relative`}>
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${currentTheme.colors.background}`}>
                                    <User className="w-16 h-16 text-slate-600" />
                                </div>
                            )}
                            <button
                                onClick={triggerFileInput}
                                disabled={isUploading}
                                className={`absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center gap-2 ${isUploading ? 'opacity-100 cursor-wait' : 'opacity-0 group-hover:opacity-100 cursor-pointer'}`}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
                                        <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest animate-pulse">Uploading</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera className={`w-6 h-6 text-${currentTheme.colors.primary}-400`} />
                                        <span className="text-[10px] text-white font-black uppercase">Edit</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>

                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            {user.name}
                        </h2>
                    </div>
                    <p className="text-cyan-400/80 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                        <span>ID: {user.studentId}</span>
                        <span className={`w-1.5 h-1.5 rounded-full bg-${currentTheme.colors.primary}-400/50`}></span>
                        <span>Lvl: {getRankFromExp(user.exp || 0)?.id || 1}</span>
                    </p>
                    <div className="flex flex-row gap-4 items-center mt-2">
                        <span className={`px-3 py-2 rounded-lg bg-${currentTheme.colors.primary}-500/10 border border-${currentTheme.colors.primary}-500/30 text-${currentTheme.colors.primary}-400 text-[10px] font-black uppercase tracking-widest flex items-center`}>
                            {user.rankName}
                        </span>

                        <button
                            onClick={handleEditClick}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all group`}
                        >
                            <Edit className={`w-3 h-3 text-slate-400 group-hover:text-${currentTheme.colors.primary}-400`} />
                            <span className="text-[10px] font-black text-slate-300 group-hover:text-white uppercase tracking-widest">Edit Profile</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mb-12">
                <div className={`bg-slate-900/40 border border-white/5 p-6 rounded-3xl text-center`}>
                    <div className={`text-2xl font-black text-${currentTheme.colors.accent}-400 mb-1`}>{stats.winnings}</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Winnings</div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl text-center">
                    <div className="text-2xl font-black text-rose-400 mb-1">{stats.losses}</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Losses</div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl text-center">
                    <div className={`text-2xl font-black text-${currentTheme.colors.primary}-400 mb-1`}>{stats.winRate}</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Win Rate</div>
                </div>
            </div>

            {/* Rank History Preview */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-white italic uppercase tracking-wider flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-amber-500" /> Current Rank
                    </h3>

                </div>
                <div className="grid grid-cols-2 gap-4">
                    {/* Current Rank Card - Minimal Vertical */}
                    <div className="p-6 flex flex-col items-center justify-center gap-4 group hover:bg-white/5 rounded-3xl transition-colors text-center">
                        <div className="group-hover:scale-110 transition-transform duration-500">
                            {/* Displaying rank icon directly from context/image since currentRankDetail structure in context is simpler */}
                            <img src={user.rankIcon} className={`w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.6)]`} alt="Rank" />
                        </div>
                        <div className="text-xl font-black text-white italic uppercase tracking-tighter drop-shadow-lg">
                            {user.rankName}
                        </div>
                    </div>

                    {/* Leaderboard Rank Card - Minimal Vertical */}
                    <div className="p-6 flex flex-col items-center justify-center gap-4 group hover:bg-white/5 rounded-3xl transition-colors text-center">
                        <div className="group-hover:scale-110 transition-transform duration-500">
                            <Target className="w-16 h-16 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
                        </div>
                        <div className="text-xl font-black text-white italic uppercase tracking-tighter drop-shadow-lg">
                            #{leaderboardRank || '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Matches (Last 5) */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-white italic uppercase tracking-wider flex items-center gap-3">
                        <Swords className="w-5 h-5 text-rose-400" /> Recent Matches
                    </h3>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        {matchHistory.length} Total
                    </span>
                </div>

                {matchHistory.length > 0 ? (
                    <div className="space-y-3">
                        {/* Split into 1v1 Duels and Multiplayer sections */}
                        {(() => {
                            const recent = matchHistory;
                            const duels = recent.filter(m => m.mode === '1v1 Duel' || m.mode === 'duel');
                            const multi = recent.filter(m => m.mode !== '1v1 Duel' && m.mode !== 'duel');
                            
                            return (
                                <>
                                    {duels.length > 0 && (
                                        <>
                                            <div className={`text-[10px] font-black text-${currentTheme.colors.primary}-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2`}>
                                                <Swords className="w-3 h-3" /> 1v1 Duel
                                            </div>
                                            {duels.map((match) => (
                                                <div key={match.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-white/5 transition-colors">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${match.result === 'Win' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                                        {match.result === 'Win' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black text-white truncate">vs {match.hero}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                                            <Clock className="w-3 h-3" /> {match.time}
                                                        </p>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${match.result === 'Win' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                        {match.outcome}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {multi.length > 0 && (
                                        <>
                                            <div className={`text-[10px] font-black text-purple-400 uppercase tracking-widest ${duels.length > 0 ? 'mt-4' : ''} mb-2 px-1 flex items-center gap-2`}>
                                                <Users className="w-3 h-3" /> Multiplayer Battle
                                            </div>
                                            {multi.map((match) => (
                                                <div key={match.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-white/5 transition-colors">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${match.result === 'Win' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                                        {match.result === 'Win' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black text-white truncate">vs {match.hero}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                                            <Clock className="w-3 h-3" /> {match.time}
                                                        </p>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${match.result === 'Win' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                        {match.outcome}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-900/20 border border-white/5 rounded-2xl">
                        <Swords className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No matches played yet</p>
                        <p className="text-slate-600 text-[10px] mt-1">Play 1v1 Duels or Multiplayer Battles to see results here</p>
                    </div>
                )}
            </div>
        </div >
    );

    const renderFriendsContent = () => {
        const fetchFriends = async () => {
            setFriendsLoading(true);
            try {
                const result = await userAPI.getFriends();
                setFriendsList(result?.friends || result || []);
            } catch (e) {
                console.error('Failed to fetch friends:', e);
            } finally {
                setFriendsLoading(false);
            }
        };
        // Only fetch once when this renders
        if (!friendsLoading && friendsList.length === 0) fetchFriends();

        // Helper to get name from whatever field the API uses
        const getFriendName = (f) =>
            f.name || f.full_name || f.username || f.user_name || f.display_name || 'Unknown';
        const getFriendAvatar = (f) =>
            f.avatar_url || f.avatar || f.profilePicture || null;

        const handleViewFriendProfile = async (friendId) => {
            setIsFriendLoading(true);
            setIsFriendViewerOpen(true);
            try {
                const data = await userAPI.getUserProfile(friendId);
                setSelectedFriend(data?.profile || data?.user || data);
            } catch (error) {
                console.error('Failed to load friend profile', error);
                toast.error('Could not load friend profile.');
                setIsFriendViewerOpen(false);
            } finally {
                setIsFriendLoading(false);
            }
        };

        const handleUnfriend = (friend, e) => {
            e.stopPropagation();
            playClick();
            setFriendToRemove(friend);
        };

        const onlineFriends = friendsList.filter(f => onlineUserIds.has(String(f.id)) || onlineUserIds.has(f.id));
        const offlineFriends = friendsList.filter(f => !onlineUserIds.has(String(f.id)) && !onlineUserIds.has(f.id));
        return (
            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                <h3 className={`text-2xl font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-4`}>
                    <Users className={`w-6 h-6 text-${currentTheme.colors.primary}-400`} /> Friends
                    <span className="ml-auto text-sm font-bold text-slate-500 normal-case tracking-normal">{friendsList.length} total</span>
                </h3>

                {friendsLoading ? (
                    <div className="flex items-center justify-center py-20 opacity-40">
                        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : friendsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <Users className="w-16 h-16 text-slate-600 mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No friends yet</p>
                        <p className="text-slate-600 text-xs mt-2">Add friends from the duel lobby!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {onlineFriends.length > 0 && (
                            <>
                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 px-1">Online — {onlineFriends.length}</div>
                                {onlineFriends.map(friend => (
                                    <div key={friend.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="relative shrink-0">
                                            {getFriendAvatar(friend) ? (
                                                <img src={getFriendAvatar(friend)} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-white truncate">{getFriendName(friend)}</p>
                                            <p className={`text-[10px] font-bold text-${currentTheme.colors.primary}-400 uppercase tracking-widest`}>{friend.rankName || 'Siege Novice'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase hidden sm:block">Online</span>
                                            <button 
                                                onClick={() => handleViewFriendProfile(friend.id)}
                                                className={`p-2 rounded-xl bg-${currentTheme.colors.primary}-500/10 hover:bg-${currentTheme.colors.primary}-500/20 text-${currentTheme.colors.primary}-400 border border-${currentTheme.colors.primary}-500/30 transition-colors`}
                                                title="View Profile"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleUnfriend(friend, e)}
                                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                                                title="Unfriend"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        {offlineFriends.length > 0 && (
                            <>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-1">Offline — {offlineFriends.length}</div>
                                {offlineFriends.map(friend => (
                                    <div key={friend.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/20 border border-white/5 opacity-60">
                                        <div className="relative shrink-0">
                                            {getFriendAvatar(friend) ? (
                                                <img src={getFriendAvatar(friend)} className="w-10 h-10 rounded-xl object-cover grayscale" alt="" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-slate-600" />
                                                </div>
                                            )}
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-900" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-400 truncate">{getFriendName(friend)}</p>
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{friend.rankName || 'Siege Novice'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-600 uppercase hidden sm:block">Offline</span>
                                            <button 
                                                onClick={() => handleViewFriendProfile(friend.id)}
                                                className="p-2 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 border border-white/5 transition-colors"
                                                title="View Profile"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleUnfriend(friend, e)}
                                                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors"
                                                title="Unfriend"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const handleChangePassword = async () => {
        if (!user?.email) return;
        setChangingPassword(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/`,
            });
            if (error) {
                // Supabase rate-limits: parse wait time if present
                const waitMatch = error.message?.match(/(\d+) second/);
                const waitSec = waitMatch ? parseInt(waitMatch[1]) : null;
                const msg = waitSec
                    ? `Please wait ${waitSec}s before requesting another reset email.`
                    : (error.message || 'Failed to send reset email. Try again.');
                toast.error(msg);
                return;
            }
            toast.success(`Password reset email sent to ${user.email}!`);
            playSuccess();
        } catch (err) {
            console.error('Password reset failed:', err);
            toast.error('Failed to send reset email. Try again.');
        } finally {
            setChangingPassword(false);
        }
    };

    const renderHistoryContent = () => (
        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
            <h3 className={`text-2xl font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-4`}>
                <History className={`w-6 h-6 text-${currentTheme.colors.primary}-400`} /> Battle History
            </h3>
            <div className="space-y-4 font-galsb">
                {matchHistory.length > 0 ? (
                    matchHistory.map((match) => (
                        <motion.div
                            key={match.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${match.result === 'Win' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                    {match.result === 'Win' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="text-sm font-black text-white uppercase italic">{match.mode}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                        <Clock className="w-3 h-3" /> {match.time}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-12">
                                <div className="text-right">
                                    <div className="text-xs font-black text-slate-300 uppercase italic mb-1">{match.hero}</div>
                                    <div className={`text-[10px] text-${currentTheme.colors.primary}-400 font-bold uppercase tracking-widest`}>MVP</div>
                                </div>
                                <div className={`text-xl font-black italic tracking-tighter ${match.result === 'Win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {match.outcome}
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">
                        No battles found yet
                    </div>
                )}
            </div>
        </div>
    );

    const renderCollectionContent = () => (
        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar font-galsb">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-widest flex items-center gap-4">
                    <Book className="w-6 h-6 text-purple-400" /> Collection
                </h3>

            </div>
            <div className="font-galsb">
                {collection.length > 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {collection.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -5 }}
                                className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden group cursor-pointer relative font-galsb font-bold italic"
                            >
                                <div className="aspect-square relative font-galsb">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover font-galsb group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent font-galsb" />
                                    <div className="absolute bottom-4 left-4 font-galsb">
                                        <div className={`text-[10px] text-${currentTheme.colors.primary}-400 font-black uppercase tracking-widest mb-1 font-galsb italic`}>{item.rarity}</div>
                                        <div className="text-base font-black text-white uppercase italic tracking-tight font-galsb">{item.name}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">
                        No items in collection
                    </div>
                )}
            </div>
        </div>
    );

    const handleDownloadCertificate = (cert) => {
        // In a real app, this would trigger a PDF download
        const link = document.createElement('a');
        link.href = '#';
        link.download = `${cert.course}_Certificate.pdf`;
        alert(`Downloading certificate for ${cert.course}...`);
        playSuccess();
    };

    const renderCertificatesContent = () => (
        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar font-galsb">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-4">
                <Award className="w-6 h-6 text-emerald-400" /> Earned Certificates
            </h3>
            <div className="space-y-4">
                {userCertificates.length > 0 ? (
                    userCertificates.map((cert) => (
                        <motion.div
                            key={cert.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/5 transition-colors group cursor-default"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Award className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="text-lg font-black text-white uppercase italic tracking-wide">{cert.course}</div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-3 h-3" /> {cert.date}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            ID: {cert.certificateId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Grade</div>
                                    <div className={`text-2xl font-black italic tracking-tighter ${cert.grade === 'A' || cert.grade === 'A+' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {cert.grade}
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-white/10"></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Instructor</div>
                                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                                        {cert.instructor}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDownloadCertificate(cert)}
                                    className="w-12 h-12 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 transition-all hover:scale-105 active:scale-95 ml-2"
                                    title="Download Certificate"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">
                        No earned certificates yet
                    </div>
                )}
            </div>
        </div>
    );

    const renderThemesContent = () => {
        const themeImages = {
            'default': gamecodebg, // Using game background for default theme
            'winter': winterTheme,
            'spooky': halloweenTheme,
            // 'christmas': christmasTheme // Future proofing
        };

        const ownedThemes = Object.values(themes).filter(theme =>
            theme.id === 'default' || (user.purchasedThemes && user.purchasedThemes.includes(theme.id))
        );

        return (
            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar font-galsb">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-4">
                    <Palette className="w-6 h-6 text-purple-400" /> Interface Themes
                </h3>

                {ownedThemes.length === 0 ? (
                    <div className="text-slate-500 font-bold uppercase tracking-widest">No themes owned yet.</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {ownedThemes.map((theme) => (
                            <motion.div
                                key={theme.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`relative group overflow-hidden rounded-3xl border transition-all duration-300 cursor-pointer ${currentTheme.id === theme.id
                                    ? `border-${currentTheme.colors.secondary}-500 shadow-[0_0_30px_rgba(var(--theme-secondary-rgb),0.3)]`
                                    : 'border-white/10 hover:border-white/30'
                                    }`}
                                onClick={() => {
                                    setTheme(theme.id);
                                    playSelect();
                                }}
                            >
                                <div className="aspect-video relative overflow-hidden group-hover:scale-105 transition-transform duration-700">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

                                    <img
                                        src={themeImages[theme.id] || gamecodebg}
                                        alt={theme.name}
                                        className="w-full h-full object-cover"
                                    />

                                    {currentTheme.id === theme.id && (
                                        <div className={`absolute top-4 right-4 z-20 bg-${currentTheme.colors.secondary}-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-2`}>
                                            <CheckCircle2 className="w-3 h-3" /> Active
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex items-center justify-between">
                                    <div>
                                        <h4 className={`text-lg font-black italic uppercase tracking-wide ${currentTheme.id === theme.id ? `text-${currentTheme.colors.secondary}-400` : 'text-white'}`}>
                                            {theme.name}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                            {currentTheme.id === theme.id ? 'Currently Selected' : 'Tap to Apply'}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderSettingsContent = () => (
        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar font-galsb">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-4">
                <Settings className="w-6 h-6 text-slate-400" /> General Settings
            </h3>
            <div className="space-y-6">
                {[
                    { label: 'Profile Privacy', icon: <Lock className="w-4 h-4" />, status: 'Public' },
                ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-white/5 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-800 rounded-xl border border-white/5 text-slate-400 group-hover:text-cyan-400 transition-colors">
                                {setting.icon}
                            </div>
                            <span className="text-sm font-black text-slate-200 uppercase tracking-widest">{setting.label}</span>
                        </div>
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">{setting.status}</span>
                    </div>
                ))}

                {/* Change Password */}
                <div
                    onClick={handleChangePassword}
                    className="flex items-center justify-between p-6 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-white/5 transition-colors cursor-pointer group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-800 rounded-xl border border-white/5 text-slate-400 group-hover:text-cyan-400 transition-colors">
                            <KeyRound className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black text-slate-200 uppercase tracking-widest">Change Password</span>
                    </div>
                    {changingPassword ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">Send Email</span>
                    )}
                </div>

                <div className="mt-12 p-8 bg-rose-500/5 border border-rose-500/20 rounded-3xl">
                    <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-4">Account Actions</h4>
                    <button className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-2xl text-xs font-black text-rose-500 uppercase tracking-widest transition-all">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-galsb">
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
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel} border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_150px_rgba(var(--theme-primary-rgb),0.1)] ring-1 ring-white/5 relative flex z-10`}
                    >
                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />
                        {/* Sidebar */}
                        <div className="w-64 bg-slate-900/40 border-r border-white/5 flex flex-col pt-20">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-4 px-10 py-6 transition-all relative ${activeTab === tab.id
                                        ? `${currentTheme.colors.text} bg-${currentTheme.colors.primary}-500/5`
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTabGlow"
                                            className={`absolute left-0 top-0 bottom-0 w-1 bg-${currentTheme.colors.primary}-400 shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.8)]`}
                                        />
                                    )}
                                    {tab.icon}
                                    <span className="text-sm font-black uppercase tracking-widest">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex overflow-hidden relative">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-180 z-50"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Unfriend Confirm Modal */}
                            <AnimatePresence>
                                {friendToRemove && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            className="bg-slate-900 border border-rose-500/30 w-full max-w-sm rounded-[2rem] p-8 text-center shadow-[0_0_50px_rgba(244,63,94,0.2)]"
                                        >
                                            <div className="w-16 h-16 mx-auto bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-2xl mb-6">
                                                <UserMinus className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-xl font-black text-white italic uppercase tracking-wider mb-2">Remove Friend?</h3>
                                            <p className="text-slate-400 text-sm mb-8">
                                                Are you sure you want to unfriend <span className="text-rose-400 font-bold">{friendToRemove.name || friendToRemove.username}</span>? This action cannot be undone.
                                            </p>
                                            
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setFriendToRemove(null)}
                                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-wider transition-colors border border-white/10"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={confirmUnfriend}
                                                    className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black uppercase tracking-wider transition-colors shadow-lg shadow-rose-500/20"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Content Renders */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex-1 flex"
                                >
                                    {activeTab === 'profile' && renderProfileContent()}
                                    {activeTab === 'history' && renderHistoryContent()}
                                    {activeTab === 'friends' && renderFriendsContent()}
                                    {activeTab === 'collection' && renderCollectionContent()}
                                    {activeTab === 'certificates' && renderCertificatesContent()}
                                    {activeTab === 'themes' && renderThemesContent()}
                                    {activeTab === 'settings' && renderSettingsContent()}
                                </motion.div>
                            </AnimatePresence>

                            {/* Right Side: Hero Preview */}
                            <div className="w-[45%] h-full relative border-l border-white/5 overflow-hidden">
                                {/* Background with Fade */}
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center"
                                    style={{
                                        backgroundImage: `url(${gamecodebg})`,
                                        opacity: 0.4
                                    }}
                                />
                                <div className="absolute inset-0 z-1 bg-gradient-to-l from-transparent via-[#0B0F1A]/80 to-[#0B0F1A]" />
                                <div className="absolute inset-0 z-1 bg-gradient-to-t from-[#0B0F1A] via-transparent to-transparent" />

                                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
                                    <motion.img
                                        initial={{ x: 50, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1, scale: 0.8 }}
                                        src={activeHero.image}
                                        alt="Chosen Hero"
                                        className="w-full max-h-[60vh] object-contain drop-shadow-[0_20px_50px_rgba(34,211,238,0.3)] filter brightness-110"
                                    />
                                    <div className="mt-8 text-center bg-black/40 backdrop-blur-md px-10 py-6 rounded-3xl border border-white/10">
                                        <div className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.4em] mb-2">Current Hero</div>
                                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter italic">{activeHero.name}</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* EDIT PROFILE OVERLAY */}
                        <AnimatePresence>
                            {isEditing && (
                                <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-12">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-3xl p-8 shadow-2xl relative"
                                    >
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-widest mb-8 flex items-center gap-3">
                                            <Edit className="w-6 h-6 text-cyan-400" /> Edit Profile
                                        </h3>

                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Full Name */}
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={editForm.name || ''}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-400 focus:outline-none transition-colors"
                                                />
                                            </div>

                                            {/* Gender */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gender</label>
                                                <select
                                                    value={editForm.gender || 'Male'}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-400 focus:outline-none transition-colors appearance-none"
                                                >
                                                    <option>Male</option>
                                                    <option>Female</option>
                                                </select>
                                            </div>

                                            {/* Student ID (Read Only) */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Student ID</label>
                                                <div className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-slate-500 font-bold cursor-not-allowed">
                                                    {user.studentId}
                                                </div>
                                            </div>

                                            {/* Course (Read Only) */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Course</label>
                                                <div className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-slate-500 font-bold cursor-not-allowed">
                                                    {user.course || 'Not Set'}
                                                </div>
                                            </div>

                                            {/* Email (Read Only) */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
                                                <div className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-slate-500 font-bold cursor-not-allowed">
                                                    {user.email || 'Not Set'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-4 mt-10 pt-6 border-t border-white/5">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-6 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white font-bold uppercase text-xs tracking-widest transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-widest shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
                                            >
                                                <Save className="w-4 h-4" /> Save Changes
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* FRIEND PROFILE OVERLAY */}
                        <AnimatePresence>
                            {isFriendViewerOpen && (
                                <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-8">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="w-full max-w-4xl bg-[#0B0F1A] border border-cyan-500/20 rounded-[2rem] p-8 shadow-2xl relative flex flex-col md:flex-row gap-8 mt-10 md:mt-0"
                                    >
                                        <button
                                            onClick={() => setIsFriendViewerOpen(false)}
                                            className="absolute -top-12 right-0 md:-top-5 md:-right-5 p-2.5 rounded-full bg-slate-900 hover:bg-rose-500/20 border-2 border-white/10 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-all z-50 shadow-xl"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        
                                        {isFriendLoading ? (
                                            <div className="flex w-full flex-col items-center justify-center py-20 gap-4">
                                                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                                <p className="text-cyan-400/80 font-black uppercase tracking-widest text-xs">Loading Profile...</p>
                                            </div>
                                        ) : selectedFriend ? (
                                            <>
                                                {/* LEFT COLUMN: Avatar and Core Stats */}
                                                <div className="flex-1 flex flex-col items-center relative z-10 font-galsb">
                                                    <div className="relative mb-6">
                                                        <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                                                            {selectedFriend.profile_picture_url || selectedFriend.avatar || selectedFriend.avatar_url ? (
                                                                <img src={selectedFriend.profile_picture_url || selectedFriend.avatar || selectedFriend.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                                    <User className="w-16 h-16 text-slate-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-slate-900 border border-cyan-500/30 rounded-xl flex items-center justify-center shadow-lg">
                                                            <span className="text-cyan-400 font-black text-sm">{getRankFromExp(selectedFriend.exp || selectedFriend.xp || 0)?.id || 1}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-1 relative z-10 text-center">
                                                        {selectedFriend.username || selectedFriend.name || selectedFriend.full_name || selectedFriend.display_name || selectedFriend.user_name || 'Unknown User'}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <span className="px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                                                            {selectedFriend.rank_name || getRankFromExp(selectedFriend.exp || selectedFriend.xp || 0)?.name || 'Siege Novice'}
                                                        </span>
                                                    </div>

                                                    {/* Core Stats */}
                                                    <div className="w-full grid grid-cols-2 gap-3 mb-3">
                                                        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Exp</p>
                                                            <p className="text-xl font-black text-purple-400">{(selectedFriend.exp || selectedFriend.xp || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
                                                            <p className="text-xl font-black text-emerald-400">
                                                                {selectedFriend.win_rate || '0%'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Battle Stats */}
                                                    <div className="w-full bg-slate-900/60 border border-white/5 rounded-2xl p-4 mb-3">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2">
                                                            <Swords className="w-3 h-3 text-rose-400" /> Battle Record
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-3 text-center">
                                                            <div>
                                                                <p className="text-lg font-black text-emerald-400">{selectedFriend.battle_wins || 0}</p>
                                                                <p className="text-[9px] uppercase text-slate-500 font-bold">Wins</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-black text-rose-400">{selectedFriend.battle_losses || 0}</p>
                                                                <p className="text-[9px] uppercase text-slate-500 font-bold">Losses</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-black text-slate-300">{(selectedFriend.battle_wins || 0) + (selectedFriend.battle_losses || 0)}</p>
                                                                <p className="text-[9px] uppercase text-slate-500 font-bold">Total</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Achievements & Certificates */}
                                                    <div className="w-full grid grid-cols-2 gap-3">
                                                        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center flex flex-col items-center justify-center">
                                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                                <Trophy className="w-4 h-4 text-amber-500" />
                                                                <p className="text-lg font-black text-amber-400">{selectedFriend.achievements || 0}</p>
                                                            </div>
                                                            <p className="text-[9px] uppercase text-slate-500 font-bold">Achievements</p>
                                                        </div>
                                                        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center flex flex-col items-center justify-center">
                                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                                <Award className="w-4 h-4 text-emerald-400" />
                                                                <p className="text-lg font-black text-emerald-400">{selectedFriend.certificates || 0}</p>
                                                            </div>
                                                            <p className="text-[9px] uppercase text-slate-500 font-bold">Certificates</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* RIGHT COLUMN: Recent Matches */}
                                                <div className="w-full md:w-[320px] shrink-0 flex flex-col h-full bg-slate-900/60 border border-white/5 rounded-2xl p-4 pt-10 md:pt-4">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2 shrink-0">
                                                        <History className="w-3 h-3 text-purple-400" /> Recent Matches
                                                    </p>
                                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 max-h-[400px]">
                                                        {selectedFriend.recent_battles && selectedFriend.recent_battles.length > 0 ? (
                                                            selectedFriend.recent_battles.map((match) => {
                                                                const isWin = match.winner_id === selectedFriend.id;
                                                                const isMultiplayer = match.mode !== '1v1 duel' && match.mode !== '1v1 Duel' && match.mode !== 'duel';
                                                                
                                                                // Find opponent name
                                                                let opponentName = 'Unknown';
                                                                const players = [match.player1, match.player2, match.player3, match.player4, match.player5].filter(Boolean);
                                                                const opponents = players.filter(p => p.id !== selectedFriend.id);
                                                                if (opponents.length > 0) {
                                                                    opponentName = opponents.map(o => o.username).join(', ');
                                                                }

                                                                return (
                                                                    <div key={match.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${isWin ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                                                            {isWin ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-black text-white truncate w-full tracking-wide">vs {opponentName}</p>
                                                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                                                                {isMultiplayer ? <Users className="w-3 h-3 text-purple-400" /> : <Swords className="w-3 h-3 text-cyan-400" />}
                                                                                {isMultiplayer ? 'Multiplayer' : '1v1 Duel'}
                                                                            </p>
                                                                        </div>
                                                                        <div className={`px-2 py-1 rounded bg-black/20 text-[9px] font-black uppercase tracking-widest ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                            {isWin ? 'Victory' : 'Defeat'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                                                                <Swords className="w-8 h-8 text-slate-500 mb-2" />
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Recent Matches</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full py-20 text-center text-rose-400 font-bold uppercase tracking-widest text-xs">
                                                User Not Found
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ProfileModal;
