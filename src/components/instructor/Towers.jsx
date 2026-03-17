import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Castle, Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const Towers = ({ theme }) => {
    const toast = useToast();
    const [towers, setTowers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mock initial data fetch for UI placeholder
    useEffect(() => {
        setLoading(true);
        // Simulate API fetch delay
        setTimeout(() => {
            setTowers([
                { id: 1, name: 'Tower of Foundations', status: 'Active', floors: 10 },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    const handleCreateTower = () => {
        toast.info("Tower Creation placeholder.");
    };

    return (
        <div className="puzzle-courses-container h-full flex flex-col pt-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className={`text-2xl font-black italic uppercase tracking-tighter mb-2 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Towers</h2>
                    <div className="flex items-center gap-4 text-xs font-bold tracking-widest uppercase">
                        <span className="text-cyan-500 flex items-center gap-2">
                            <Castle className="w-4 h-4" /> MANAGE GAME TOWERS
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCreateTower}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                            theme === 'dark'
                                ? 'bg-cyan-500 hover:bg-cyan-400 text-[#0B1224] shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                                : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-md'
                        }`}
                    >
                        <Plus className="w-4 h-4" /> ADD TOWER
                    </button>
                </div>
            </div>

            <div className={`flex-1 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#0B1224]/50 border-white/5' : 'bg-white border-slate-200'}`}>
                {loading ? (
                    <div className={`p-12 text-center text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Loading Towers...
                    </div>
                ) : towers.length === 0 ? (
                    <div className={`p-12 text-center text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        No towers created yet. Add a tower to get started.
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="grid gap-4">
                            {towers.map(tower => (
                                <div key={tower.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                    theme === 'dark'
                                        ? 'bg-slate-900/50 border-white/5 hover:border-cyan-500/30'
                                        : 'bg-slate-50 border-slate-200 hover:border-cyan-500/50 hover:shadow-sm'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                            theme === 'dark' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                                        }`}>
                                            <Castle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                {tower.name}
                                            </h3>
                                            <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {tower.floors} Floors • Status: <span className="text-emerald-500 font-bold">{tower.status}</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button className={`p-2 rounded-lg transition-colors ${
                                            theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                                        }`}>
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button className={`p-2 rounded-lg transition-colors ${
                                            theme === 'dark' ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-600'
                                        }`}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Towers;
