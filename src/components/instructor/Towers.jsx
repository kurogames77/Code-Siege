import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Castle, CheckCircle2, Unlock, Settings2, Search, X, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { instructorAPI } from '../../services/api';

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
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTower, setSelectedTower] = useState(null);
    const [unlockMode, setUnlockMode] = useState('all'); // 'all' or 'custom'
    const [customFloors, setCustomFloors] = useState('');
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openModal = (tower, mode) => {
        setSelectedTower(tower);
        setUnlockMode(mode);
        if (mode === 'all') setCustomFloors(tower.floors.toString());
        else setCustomFloors('');
        
        setIsModalOpen(true);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedStudent(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedTower(null);
            setSelectedStudent(null);
        }, 200);
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Re-using the general instructor search API which searches users
            const data = await instructorAPI.getUsers(1, 10, query);
            // Filter to only show students
            setSearchResults((data.users || []).filter(u => u.role === 'student'));
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleUnlock = async () => {
        if (!selectedStudent || !selectedTower) return;
        
        const floorsToUnlock = parseInt(customFloors);
        if (isNaN(floorsToUnlock) || floorsToUnlock < 0 || floorsToUnlock > selectedTower.floors) {
            toast.error(`Please enter a valid floor number up to ${selectedTower.floors}`);
            return;
        }

        try {
            setIsSubmitting(true);
            await instructorAPI.updateStudentTowerProgress(
                selectedStudent.id, 
                selectedTower.id, 
                floorsToUnlock
            );
            toast.success(`Successfully unlocked ${floorsToUnlock} floors in ${selectedTower.name} for ${selectedStudent.username}`);
            closeModal();
        } catch (error) {
            toast.error(error.message || 'Failed to unlock tower progress');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    {GAME_TOWERS.map((tower, idx) => (
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
                                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center p-2 relative overflow-hidden shrink-0 ${
                                    theme === 'dark' ? 'bg-black/40 border border-white/10' : 'bg-white border border-slate-200 shadow-sm'
                                }`}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent opacity-50 pointer-events-none" />
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
                                        title="Unlock All Levels"
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
                                        title="Custom Unlock"
                                    >
                                        <Settings2 className="w-5 h-5 mb-0.5" />
                                        <span className="text-[8px] font-black tracking-tighter uppercase">CUSTOM</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Unlock Student Selection Modal */}
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
                            className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
                                theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                        >
                            <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className={`text-xl font-black italic tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        {unlockMode === 'all' ? 'Unlock All Levels' : 'Custom Unlock'}
                                    </h3>
                                    <button onClick={closeModal} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Select a student to grant progress in <span className={`font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>{selectedTower.name}</span>.
                                </p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Search Input */}
                                <div className="relative">
                                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search by student ID or username..."
                                        value={searchQuery}
                                        onChange={handleSearch}
                                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${
                                            theme === 'dark' 
                                                ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                                        }`}
                                    />
                                    {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-cyan-500" />}
                                </div>

                                {/* Search Results */}
                                {searchQuery && !selectedStudent && (
                                    <div className={`max-h-48 overflow-y-auto rounded-xl border ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                        {searchResults.length > 0 ? (
                                            searchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => setSelectedStudent(user)}
                                                    className={`w-full flex items-center gap-4 p-3 text-left transition-colors border-b last:border-0 ${
                                                        theme === 'dark' 
                                                            ? 'hover:bg-slate-800 border-slate-800/50' 
                                                            : 'hover:bg-slate-50 border-slate-100'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-cyan-500 text-white font-bold">
                                                                {user.username?.[0]?.toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user.username}</div>
                                                        <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{user.student_id || 'No ID'}</div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : !isSearching && (
                                            <div className={`p-4 text-center text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                No students found.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Selected Student Info */}
                                {selectedStudent && (
                                    <div className={`p-4 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                {selectedStudent.avatar_url ? (
                                                    <img src={selectedStudent.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-cyan-500 text-white font-bold">
                                                        {selectedStudent.username?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className={`text-xs font-bold tracking-widest uppercase ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>Target Student</div>
                                                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedStudent.username}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedStudent(null)}
                                            className="text-xs font-bold underline text-slate-500 hover:text-slate-400 transition-colors"
                                        >
                                            Change
                                        </button>
                                    </div>
                                )}

                                {/* Floor Configuration (Visible mainly if Custom mode, or disabled visually if All mode) */}
                                {selectedStudent && (
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Floors to Unlock (Max {selectedTower.floors})
                                        </label>
                                        <input
                                            type="number"
                                            value={customFloors}
                                            onChange={(e) => setCustomFloors(e.target.value)}
                                            disabled={unlockMode === 'all'}
                                            min="0"
                                            max={selectedTower.floors}
                                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-bold ${
                                                theme === 'dark' 
                                                    ? 'bg-slate-800/50 border-slate-700 text-white disabled:opacity-50' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-900 disabled:opacity-50'
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className={`p-6 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                <button
                                    onClick={closeModal}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                                        theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUnlock}
                                    disabled={!selectedStudent || !customFloors || isSubmitting}
                                    className="px-6 py-2.5 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirm Unlock
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
