import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Trophy, Medal, Target, Swords, User, History, Settings, Info, Image as ImageIcon, CheckCircle2, XCircle, Clock, Book, Bell, Lock, Globe, Edit, Save, Award, Download, Palette } from 'lucide-react';


import useSound from '../../hooks/useSound';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext'; // Import Theme Context
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
    const { user, updateAvatar, updateProfile } = useUser();
    const { currentTheme, setTheme, themes } = useTheme(); // Destructure all needed values
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const { playClick, playCancel, playSelect, playSuccess } = useSound();
    const toast = useToast();

    // Validation for School and College
    const isValidSchool = (school) => {
        if (!school) return false;
        const valid = ['jrmsu', 'jose rizal memorial state university'];
        return valid.includes(school.toLowerCase().trim());
    };

    const isValidCollege = (college) => {
        if (!college) return false;
        const valid = ['ccs', 'college of computing studies'];
        return valid.includes(college.toLowerCase().trim());
    };

    // Hero selection logic
    const selectedHeroId = localStorage.getItem('selectedHeroId') || '3';
    const heroInfoMap = {
        '1': { name: 'Ignis', image: hero3Static },
        '2': { name: 'Daemon', image: hero4Static },
        '3': { name: 'Valerius', image: hero1aStatic },
        '4': { name: 'Nyx', image: hero2Static }
    };
    const activeHero = heroInfoMap[selectedHeroId] || heroInfoMap['3'];

    const handleEditClick = () => {
        setEditForm({
            name: user.name,
            gender: user.gender,
            school: user.school,
            college: user.college,
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
                // Pass the File object directly to match the Instructor Terminal logic
                await updateAvatar(file);
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
        { id: 'collection', label: 'Collection', icon: <ImageIcon className="w-4 h-4" /> },
        { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4" /> },
        { id: 'themes', label: 'Themes', icon: <Palette className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    ];

    const matchHistory = [];

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
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                            >
                                <Camera className={`w-6 h-6 text-${currentTheme.colors.primary}-400`} />
                                <span className="text-[10px] text-white font-black uppercase">Edit</span>
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
                    {/* Logos below profile pic - only show if school/college have values */}
                    {/* Logos below profile pic - only show if school/college match valid values */}
                    {(isValidSchool(user.school) || isValidCollege(user.college)) && (
                        <div className="flex items-center gap-4">
                            {isValidSchool(user.school) && (
                                <img src={jrmsulogo} alt={user.school} className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]" />
                            )}
                            {isValidCollege(user.college) && (
                                <img src={ccslogo} alt={user.college} className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]" />
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            {user.name}
                        </h2>
                    </div>
                    <p className="text-cyan-400/80 font-black uppercase text-xs tracking-widest mb-4">
                        ID: {user.studentId}
                    </p>
                    <div className="flex flex-col gap-4 items-start">
                        <div className="flex gap-4">
                            <span className={`px-3 py-1 rounded-lg bg-${currentTheme.colors.primary}-500/10 border border-${currentTheme.colors.primary}-500/30 text-${currentTheme.colors.primary}-400 text-[10px] font-black uppercase tracking-widest`}>
                                {user.rankName}
                            </span>

                        </div>
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
                    <div className={`text-2xl font-black text-${currentTheme.colors.accent}-400 mb-1`}>{user.stats.winnings}</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Winnings</div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl text-center">
                    <div className="text-2xl font-black text-rose-400 mb-1">{user.stats.losses}</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Losses</div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl text-center">
                    <div className={`text-2xl font-black text-${currentTheme.colors.primary}-400 mb-1`}>{user.stats.winRate}</div>
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
                            #{user.stats.leaderboardRank}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );

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
                    { label: 'College', icon: <Globe className="w-4 h-4" />, status: user.college || 'Not Set' },
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
                                className="absolute top-8 right-8 p-2.5 bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-90 z-50"
                            >
                                <X className="w-8 h-8" />
                            </button>

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

                                            {/* School */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">School</label>
                                                <input
                                                    type="text"
                                                    value={editForm.school || ''}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, school: e.target.value }))}
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-400 focus:outline-none transition-colors"
                                                />
                                            </div>

                                            {/* College */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">College</label>
                                                <input
                                                    type="text"
                                                    value={editForm.college || ''}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, college: e.target.value }))}
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-400 focus:outline-none transition-colors"
                                                />
                                            </div>

                                            {/* Course */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Course</label>
                                                <input
                                                    type="text"
                                                    value={editForm.course || ''}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, course: e.target.value }))}
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-400 focus:outline-none transition-colors"
                                                />
                                            </div>

                                            {/* Email */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
                                                <input
                                                    type="email"
                                                    value={editForm.email || ''}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-400 focus:outline-none transition-colors"
                                                />
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

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ProfileModal;
