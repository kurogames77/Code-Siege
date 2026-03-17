import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Castle, CheckCircle2 } from 'lucide-react';

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

// Shared styling from puzzle-courses isn't needed here since we use Tailwind natively
const Towers = ({ theme }) => {
    
    // Hardcoded exact mappings from PlayPage.jsx
    const GAME_TOWERS = [
        { id: 1, name: 'Tower of Eldoria', language: 'Python', langCode: 'py', floors: 30, towerImg: tower11, langIcon: pythonIcon, status: 'Active' },
        { id: 2, name: 'Tower of Tydorin', language: 'C#', langCode: 'cs', floors: 30, towerImg: tower22, langIcon: csharpIcon, status: 'Active' },
        { id: 3, name: 'Shadow Keep', language: 'C++', langCode: 'cpp', floors: 39, towerImg: tower33, langIcon: cppIcon, status: 'Active' },
        { id: 4, name: 'Tower of Prytody', language: 'JavaScript', langCode: 'js', floors: 30, towerImg: tower44, langIcon: javascriptIcon, status: 'Active' },
        { id: 5, name: 'Tower of Abyss', language: 'MySQL', langCode: 'mysql', floors: 30, towerImg: tower55, langIcon: mysqlIcon, status: 'Active' },
        { id: 6, name: 'Tower of Aeterd', language: 'PHP', langCode: 'php', floors: 30, towerImg: tower66, langIcon: phpIcon, status: 'Active' },
    ];

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
                            className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
                            theme === 'dark'
                                ? 'bg-slate-900/50 border-white/5 hover:border-cyan-500/30 hover:bg-slate-900/80'
                                : 'bg-slate-50 border-slate-200 hover:border-cyan-500/50 hover:shadow-md'
                        }`}>
                            <div className="flex items-center gap-8">
                                {/* Tower Image */}
                                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center p-2 relative overflow-hidden ${
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
                            
                            <div className="flex items-center gap-4">
                                {/* Mapped Language Badge */}
                                <div className={`flex items-center gap-4 px-5 py-3 rounded-2xl border transition-colors ${
                                    theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100 shadow-sm'
                                }`}>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Target Language</span>
                                        <span className={`text-sm font-bold tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tower.language}</span>
                                    </div>
                                    <img src={tower.langIcon} alt={tower.language} className="w-10 h-10 object-contain drop-shadow-md" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Towers;
