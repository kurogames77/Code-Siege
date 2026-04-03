import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Castle, CheckCircle2, Unlock, Lock, Settings2, Users, X, Loader2, UserX, AlertTriangle, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import { instructorAPI } from '../../services/api';
import supabase from '../../lib/supabase';

import { useUser } from '../../contexts/UserContext';

// Game Map Towers
import tower11 from '../../assets/tower11.png';
import tower22 from '../../assets/tower22.png';
import tower33 from '../../assets/tower33.png';
import tower44 from '../../assets/tower44.png';
import tower55 from '../../assets/tower55.png';
import tower66 from '../../assets/tower66.png';

// Language Icons
import pythonIcon from '../../assets/PYTHON LOGO.png';
import csharpIcon from '../../assets/csharp-Photoroom.png';
import cppIcon from '../../assets/C++-Photoroom.png';
import javascriptIcon from '../../assets/free-javascript-3d-icon-download-in-png-blend-fbx-gltf-file-formats--html-logo-vue-angular-coding-lang-pack-logos-icons-7577991-Photoroom.png';
import mysqlIcon from '../../assets/free-mysql-9294870-7578013-Photoroom.png';
import phpIcon from '../../assets/php_emblem-Photoroom.png';

const GAME_TOWERS = [
    { id: 1, name: 'Tower of Eldoria', language: 'Python', floors: 30, towerImg: tower11, langIcon: pythonIcon, status: 'Active' },
    { id: 2, name: 'Tower of Tydorin', language: 'C#', floors: 30, towerImg: tower22, langIcon: csharpIcon, status: 'Active' },
    { id: 3, name: 'Shadow Keep', language: 'C++', floors: 39, towerImg: tower33, langIcon: cppIcon, status: 'Active' },
    { id: 4, name: 'Tower of Prytody', language: 'JavaScript', floors: 30, towerImg: tower44, langIcon: javascriptIcon, status: 'Active' },
    { id: 5, name: 'Tower of Abyss', language: 'MySQL', floors: 30, towerImg: tower55, langIcon: mysqlIcon, status: 'Active' },
    { id: 6, name: 'Tower of Aeterd', language: 'PHP', floors: 30, towerImg: tower66, langIcon: phpIcon, status: 'Active' },
];

const Towers = ({ theme }) => {
    const toast = useToast();
    const { user } = useUser();
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTower, setSelectedTower] = useState(null);
    const [unlockMode, setUnlockMode] = useState('all'); // 'all', 'custom', 'undo'
    const [customFloors, setCustomFloors] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ban Request State
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [banTower, setBanTower] = useState(null);
    const [banSearch, setBanSearch] = useState('');
    const [banStudents, setBanStudents] = useState([]);
    const [banLoading, setBanLoading] = useState(false);
    const [selectedBanStudent, setSelectedBanStudent] = useState(null);
    const [banReason, setBanReason] = useState('');
    const [banSubmitting, setBanSubmitting] = useState(false);

    // Fetch instructor's assigned courses from the courses table
    const { data: instructorCourses = [], isLoading: coursesLoading } = useQuery({
        queryKey: ['instructorTowerCourses'],
        queryFn: () => instructorAPI.getCourses(),
    });

    // Filter Towers based on the instructor's assigned courses
    const filteredTowers = GAME_TOWERS.filter(tower => {
        // Admin bypass — admins see all towers
        if (user?.role === 'admin') return true;

        // Still loading courses, show nothing yet
        if (coursesLoading) return false;

        // If instructor has no courses assigned, show none
        if (instructorCourses.length === 0) return false;

        // Match tower language against the instructor's course names (case-insensitive)
        const assignedLanguages = instructorCourses.map(c => c.name?.toLowerCase().trim()).filter(Boolean);
        const towerLang = tower.language.toLowerCase().trim();
        return assignedLanguages.some(lang => towerLang === lang || towerLang.includes(lang) || lang.includes(towerLang));
    });

    const openModal = (tower, mode) => {
        setSelectedTower(tower);
        setUnlockMode(mode);
        if (mode === 'all') setCustomFloors(tower.floors.toString());
        else if (mode === 'undo') setCustomFloors('0');
        else setCustomFloors('');
        
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedTower(null);
        }, 200);
    };

    const handleUnlock = async () => {
        if (!selectedTower) return;
        
        const floorsToUnlock = parseInt(customFloors);
        if (isNaN(floorsToUnlock) || floorsToUnlock < 0 || floorsToUnlock > selectedTower.floors) {
            toast.error(`Please enter a valid floor number up to ${selectedTower.floors}`);
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await instructorAPI.updateGlobalTowerProgress(
                selectedTower.id, 
                floorsToUnlock
            );
            const actionMsg = unlockMode === 'undo' ? `Locked all floors globally in ${selectedTower.name}` : `Globally unlocked ${floorsToUnlock} floors in ${selectedTower.name}`;
            toast.success(res.message || actionMsg);
            closeModal();
        } catch (error) {
            toast.error(error.message || 'Failed to update tower progress globally');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ban Request Functions
    const openBanModal = async (tower) => {
        setBanTower(tower);
        setIsBanModalOpen(true);
        setBanSearch('');
        setSelectedBanStudent(null);
        setBanReason('');
        setBanStudents([]);
        setBanLoading(true);

        try {
            // Fetch students who have progress on this tower
            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, student_id, email, tower_progress, is_banned')
                .in('role', ['user', 'student'])
                .eq('is_banned', false);

            if (!error && users) {
                const studentsWithProgress = users.filter(u => {
                    const progress = u.tower_progress || {};
                    return progress[tower.id] && progress[tower.id] > 0;
                });
                setBanStudents(studentsWithProgress);
            }
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setBanLoading(false);
        }
    };

    const closeBanModal = () => {
        setIsBanModalOpen(false);
        setTimeout(() => {
            setBanTower(null);
            setSelectedBanStudent(null);
        }, 200);
    };

    const handleBanRequest = async () => {
        if (!selectedBanStudent || !banTower) return;
        try {
            setBanSubmitting(true);
            const res = await instructorAPI.requestBanStudent(
                selectedBanStudent.id,
                selectedBanStudent.username,
                banReason || 'Instructor requested ban',
                banTower.name
            );
            toast.success(res.message || 'Ban request submitted successfully!');
            closeBanModal();
        } catch (error) {
            toast.error(error.message || 'Failed to submit ban request');
        } finally {
            setBanSubmitting(false);
        }
    };

    const filteredBanStudents = banStudents.filter(s =>
        s.username?.toLowerCase().includes(banSearch.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(banSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(banSearch.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col pt-8 space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-2xl font-black italic uppercase tracking-tighter mb-2 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Towers</h2>
                    <div className="flex items-center gap-4 text-xs font-bold tracking-widest uppercase items-center">
                        <span className={`flex items-center gap-2 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                            <span className="w-8 h-0.5 bg-current rounded-full" />
                            <Castle className="w-4 h-4" /> GAME MAP STRUCTURES
                        </span>
                    </div>
                </div>
            </div>

            <div className={`flex-1 rounded-2xl border transition-colors overflow-hidden ${theme === 'dark' ? 'bg-[#0B1224]/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="p-8 grid gap-6">
                    {coursesLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-64">
                            <Loader2 className={`w-8 h-8 animate-spin mb-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} />
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Loading your assigned towers...</p>
                        </div>
                    ) : filteredTowers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-64 border-2 border-dashed border-slate-700/50 rounded-2xl">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <Settings2 className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No Active Towers Found</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                You have no courses assigned yet. Please create a course in <strong>Puzzle Courses</strong> to manage its corresponding tower.
                            </p>
                        </div>
                    ) : (
                        filteredTowers.map((tower, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={tower.id} 
                            className={`flex flex-col md:flex-row md:items-center justify-between p-6 gap-6 rounded-2xl border transition-all ${
                            theme === 'dark'
                                ? 'bg-slate-900/50 border-white/5 hover:border-cyan-500/30 hover:bg-slate-900/80'
                                : 'bg-slate-50 border-slate-200 hover:border-cyan-500/50 hover:shadow-md'
                        }`}>
                            <div className="flex items-center gap-8">
                                <div className="w-24 h-24 rounded-2xl flex items-center justify-center p-2 relative overflow-hidden shrink-0">
                                    <img src={tower.towerImg} alt={tower.name} className="w-full h-full object-contain filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] z-10" />
                                </div>
                                
                                <div>
                                    <h3 className={`text-2xl font-black italic tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        {tower.name}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {tower.status}
                                        </p>
                                        <div className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {tower.floors} Floors Available
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap md:flex-nowrap items-center gap-4">
                                <div className={`flex items-center gap-4 px-5 py-3 rounded-2xl border transition-colors ${
                                    theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100 shadow-sm'
                                }`}>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Language</span>
                                        <span className={`text-sm font-bold tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tower.language}</span>
                                    </div>
                                    <img src={tower.langIcon} alt={tower.language} className="w-10 h-10 object-contain drop-shadow-md" />
                                </div>

                                {/* Unlock Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openModal(tower, 'all')}
                                        className={`flex flex-col items-center justify-center p-3 w-14 h-14 rounded-xl border transition-all ${
                                            theme === 'dark' 
                                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black' 
                                                : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-600 hover:text-white hover:border-transparent'
                                        }`}
                                        title="Unlock All Levels for Every Student"
                                    >
                                        <Unlock className="w-5 h-5 mb-0.5" />
                                        <span className="text-[8px] font-black tracking-tighter uppercase">ALL</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => openModal(tower, 'custom')}
                                        className={`flex flex-col items-center justify-center p-3 w-14 h-14 rounded-xl border transition-all ${
                                            theme === 'dark' 
                                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white' 
                                                : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-transparent'
                                        }`}
                                        title="Custom Unlock for Every Student"
                                    >
                                        <Settings2 className="w-5 h-5 mb-0.5" />
                                        <span className="text-[8px] font-black tracking-tighter uppercase">CUSTOM</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => openModal(tower, 'undo')}
                                        className={`flex flex-col items-center justify-center p-3 w-14 h-14 rounded-xl border transition-all ${
                                            theme === 'dark' 
                                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white' 
                                                : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-transparent'
                                        }`}
                                        title="Undo Unlock / Lock Tower"
                                    >
                                        <Lock className="w-5 h-5 mb-0.5" />
                                        <span className="text-[8px] font-black tracking-tighter uppercase">UNDO</span>
                                    </button>
                                    <button
                                        onClick={() => openBanModal(tower)}
                                        className={`flex flex-col items-center justify-center p-3 w-14 h-14 rounded-xl border transition-all ${
                                            theme === 'dark' 
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black' 
                                                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white hover:border-transparent'
                                        }`}
                                        title="Request to Ban/Disable a Student"
                                    >
                                        <UserX className="w-5 h-5 mb-0.5" />
                                        <span className="text-[8px] font-black tracking-tighter uppercase">BAN</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )))}
                </div>
            </div>

            {/* Global Unlock Modal */}
            <AnimatePresence>
                {isModalOpen && selectedTower && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={closeModal}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                        >
                            <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className={`text-xl font-black italic tracking-tighter flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        <Users className="w-5 h-5 text-cyan-500" />
                                        {unlockMode === 'all' ? 'Globally Unlock All Levels' : unlockMode === 'undo' ? 'Globally Lock Tower' : 'Global Custom Unlock'}
                                    </h3>
                                    <button onClick={closeModal} className={`p-2 rounded-full transition-all duration-300 hover:rotate-180 hover:shadow-[0_0_15px_rgba(244,63,94,0.6)] ${theme === 'dark' ? 'hover:bg-rose-500 hover:text-white text-slate-400' : 'hover:bg-rose-500 hover:text-white text-slate-500'}`}>
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    You are about to modify progress for <span className="font-bold text-red-400">EVERY STUDENT</span> in the database for <span className={`font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>{selectedTower.name}</span>.
                                </p>
                            </div>

                            <div className="p-6">
                                {unlockMode === 'all' ? (
                                    <div className={`p-4 rounded-xl border text-center ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                        <p className="text-sm font-bold">This will grant {selectedTower.floors} floors to ALL students instantly.</p>
                                        <p className="text-xs mt-1 opacity-80">There is no undo button. Please confirm this action.</p>
                                    </div>
                                ) : unlockMode === 'undo' ? (
                                    <div className={`p-4 rounded-xl border text-center ${theme === 'dark' ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                        <p className="text-sm font-bold">This will reset progress constraints back to default, locking all non-earned floors for ALL students.</p>
                                        <p className="text-xs mt-1 opacity-80">There is no undo button. Please confirm this action.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <label className={`block text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Floors to Unlock for Everyone (Max {selectedTower.floors})
                                        </label>
                                        <input
                                            type="number"
                                            value={customFloors}
                                            onChange={(e) => setCustomFloors(e.target.value)}
                                            min="0"
                                            max={selectedTower.floors}
                                            autoFocus
                                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-bold text-lg text-center ${
                                                theme === 'dark' 
                                                    ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className={`p-6 border-t flex gap-3 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                <button
                                    onClick={handleUnlock}
                                    disabled={!customFloors || isSubmitting}
                                    className="w-full py-2.5 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirm Action
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Ban Request Modal */}
            <AnimatePresence>
                {isBanModalOpen && banTower && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={closeBanModal}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                        >
                            <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className={`text-xl font-black italic tracking-tighter flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        Request Ban/Disable
                                    </h3>
                                    <button onClick={closeBanModal} className={`p-2 rounded-full transition-all duration-300 hover:rotate-180 ${theme === 'dark' ? 'hover:bg-rose-500 hover:text-white text-slate-400' : 'hover:bg-rose-500 hover:text-white text-slate-500'}`}>
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Select a student from <span className={`font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>{banTower.name}</span> to request ban/disable. The admin will review your request.
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Search */}
                                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <Search className="w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search student..."
                                        value={banSearch}
                                        onChange={(e) => setBanSearch(e.target.value)}
                                        className={`flex-1 bg-transparent outline-none text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                                    />
                                </div>

                                {/* Student List */}
                                <div className={`max-h-48 overflow-y-auto rounded-xl border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                    {banLoading ? (
                                        <div className="flex items-center justify-center p-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                                        </div>
                                    ) : filteredBanStudents.length === 0 ? (
                                        <div className={`p-6 text-center text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {banStudents.length === 0 ? 'No students have progress on this tower yet.' : 'No students match your search.'}
                                        </div>
                                    ) : (
                                        filteredBanStudents.map((student) => (
                                            <button
                                                key={student.id}
                                                onClick={() => setSelectedBanStudent(student)}
                                                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors border-b last:border-b-0 ${
                                                    selectedBanStudent?.id === student.id
                                                        ? (theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200')
                                                        : (theme === 'dark' ? 'hover:bg-slate-800/50 border-slate-700/50' : 'hover:bg-slate-50 border-slate-100')
                                                }`}
                                            >
                                                <div>
                                                    <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{student.username}</div>
                                                    <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{student.student_id || student.email}</div>
                                                </div>
                                                {selectedBanStudent?.id === student.id && (
                                                    <CheckCircle2 className="w-5 h-5 text-amber-500" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Reason */}
                                {selectedBanStudent && (
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Reason for Ban Request</label>
                                        <textarea
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            placeholder="Describe why this student should be banned..."
                                            rows={3}
                                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm resize-none ${
                                                theme === 'dark'
                                                    ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className={`p-6 border-t flex gap-3 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                <button
                                    onClick={closeBanModal}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                                        theme === 'dark' ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBanRequest}
                                    disabled={!selectedBanStudent || banSubmitting}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {banSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Submit Ban Request
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Towers;
