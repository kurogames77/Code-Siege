import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Shield, Trash2, UserSquare, Calendar, Clock, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_GUESTS = [
    {
        id: 'GUEST-819A-402C',
        ipHint: '192.168.1.***',
        joinedAt: '2023-11-20T14:30:00Z',
        lastActive: '2023-11-20T15:45:00Z',
        gamesPlayed: 12,
        status: 'active'
    },
    {
        id: 'GUEST-2B71-9F3E',
        ipHint: '10.0.0.***',
        joinedAt: '2023-11-19T09:15:00Z',
        lastActive: '2023-11-19T09:45:00Z',
        gamesPlayed: 3,
        status: 'inactive'
    },
    {
        id: 'GUEST-CC42-1D88',
        ipHint: '172.16.5.***',
        joinedAt: '2023-11-21T18:20:00Z',
        lastActive: '2023-11-21T21:10:00Z',
        gamesPlayed: 25,
        status: 'active'
    },
    {
        id: 'GUEST-F1E9-55A3',
        ipHint: '192.168.0.***',
        joinedAt: '2023-10-15T10:00:00Z',
        lastActive: '2023-10-15T10:30:00Z',
        gamesPlayed: 5,
        status: 'purged'
    },
    {
        id: 'GUEST-98D4-B2C1',
        ipHint: '10.1.1.***',
        joinedAt: '2023-11-22T08:00:00Z',
        lastActive: '2023-11-22T08:15:00Z',
        gamesPlayed: 1,
        status: 'active'
    }
];

const GuestManagement = ({ theme = 'dark' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredGuests = MOCK_GUESTS.filter(guest => {
        const matchesSearch = guest.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              guest.ipHint.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || guest.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-black italic tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>GUEST MANAGEMENT</h2>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        System Visitors & Trial Accounts
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-64">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            placeholder="Search Guest ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none transition-all text-sm font-medium ${
                                theme === 'dark'
                                    ? 'bg-[#0B1224] border-cyan-500/20 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50'
                            }`}
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative">
                        <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={`pl-9 pr-8 py-2 rounded-xl border outline-none transition-all text-sm font-medium appearance-none cursor-pointer ${
                                theme === 'dark'
                                    ? 'bg-[#0B1224] border-cyan-500/20 text-white hover:border-cyan-400'
                                    : 'bg-white border-slate-200 text-slate-900 hover:border-cyan-500'
                            }`}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="purged">Purged</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total Guests', value: MOCK_GUESTS.length, icon: UserSquare, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                    { label: 'Active Sessions', value: MOCK_GUESTS.filter(g => g.status === 'active').length, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Purged Data', value: MOCK_GUESTS.filter(g => g.status === 'purged').length, icon: Trash2, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-4 rounded-xl border ${theme === 'dark' ? `bg-[#0B1224] ${stat.border}` : 'bg-white border-slate-100 shadow-sm'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</p>
                                <p className={`text-2xl font-black mt-1 font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Table */}
            <div className={`border rounded-xl overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-[#0B1224] border-cyan-500/20' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b text-[10px] uppercase tracking-widest font-bold ${theme === 'dark' ? 'bg-cyan-950/20 border-cyan-500/20 text-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <th className="p-4 indent-2">Guest Identifier</th>
                                <th className="p-4">Session Info</th>
                                <th className="p-4">Activity</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredGuests.length > 0 ? (
                                filteredGuests.map((guest, idx) => (
                                    <motion.tr 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={guest.id} 
                                        className={`border-b last:border-0 transition-colors ${
                                            theme === 'dark' 
                                                ? 'border-slate-800/50 hover:bg-white/[0.02]' 
                                                : 'border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                                    theme === 'dark'
                                                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                                                        : 'bg-slate-100 border-slate-200 text-slate-500'
                                                }`}>
                                                    <UserSquare className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{guest.id}</div>
                                                    <div className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <Shield className="w-3 h-3" /> {guest.ipHint}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <div className={`flex items-center gap-1.5 text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    <Calendar className="w-3.5 h-3.5 opacity-70" /> {formatDate(guest.joinedAt)}
                                                </div>
                                                <div className={`flex items-center gap-1.5 text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    <Clock className="w-3.5 h-3.5 opacity-70" /> Last seen: {formatDate(guest.lastActive)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md ${theme === 'dark' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                                    <Play className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{guest.gamesPlayed}</div>
                                                    <div className={`text-[10px] uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Matches</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold border ${
                                                guest.status === 'active' 
                                                    ? (theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200')
                                                    : guest.status === 'inactive'
                                                    ? (theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200')
                                                    : (theme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200')
                                            }`}>
                                                {guest.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button className={`p-2 rounded-lg transition-colors ${
                                                theme === 'dark' 
                                                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                                                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                                            }`}>
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center">
                                        <div className={`inline-flex flex-col items-center justify-center p-6 rounded-xl border border-dashed ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
                                            <UserSquare className="w-8 h-8 mb-2 opacity-50" />
                                            <div className="font-bold text-sm">No Guests Found</div>
                                            <div className="text-xs uppercase tracking-widest mt-1 opacity-70">Adjust search parameters</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GuestManagement;
