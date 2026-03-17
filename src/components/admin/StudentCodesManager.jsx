import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Search, Loader2, Trash2, CheckCircle, AlertCircle, Copy, Check, Upload } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const StudentCodesManager = ({ theme }) => {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [codesInput, setCodesInput] = useState('');
    const toast = useToast();
    const [copiedId, setCopiedId] = useState(null);
    const [selectedCodes, setSelectedCodes] = useState(new Set());
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [autoGenProgress, setAutoGenProgress] = useState(0);
    const [numToGenerate, setNumToGenerate] = useState(10);

    const fetchCodes = async () => {
        try {
            setLoading(true);
            const response = await api.instructor.getStudentCodes(page, 20, search);
            setCodes(response.codes);
            setTotalPages(response.totalPages);
            setSelectedCodes(new Set()); // Reset selections on page change
        } catch (error) {
            console.error('Failed to fetch codes:', error);
            toast.popup('Failed to fetch student codes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCodes();
    }, [page, search]);

    const handleUpload = async () => {
        if (!codesInput.trim()) {
            toast.popup('Please enter at least one code');
            return;
        }

        // Split by newline or comma, trim whitespace, and filter empty strings
        const codesArray = codesInput
            .split(/[\n,]+/)
            .map(c => c.trim())
            .filter(c => c.length > 0);

        if (codesArray.length === 0) {
            toast.popup('No valid codes to upload');
            return;
        }

        try {
            setGenerating(true);
            await api.instructor.uploadStudentCodes(codesArray);
            toast.popup(`Successfully uploaded ${codesArray.length} codes!`);
            setPage(1);
            setCodesInput('');
            fetchCodes();
        } catch (error) {
            console.error('Failed to upload codes:', error);
            toast.popup(error.message || 'Failed to upload codes', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this code?')) return;

        try {
            await api.instructor.deleteStudentCode(id);
            toast.popup('Code deleted');
            fetchCodes();
        } catch (error) {
            console.error('Failed to delete code:', error);
            toast.popup('Failed to delete code', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCodes.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedCodes.size} selected codes?`)) return;

        try {
            setLoading(true);
            await api.instructor.bulkDeleteStudentCodes(Array.from(selectedCodes));
            toast.popup(`Deleted ${selectedCodes.size} codes`);
            setSelectedCodes(new Set());
            fetchCodes();
        } catch (error) {
            console.error('Failed to bulk delete:', error);
            toast.popup('Failed to delete selected codes', 'error');
            setLoading(false);
        }
    };

    const handleAutoGen = async () => {
        if (numToGenerate < 1 || numToGenerate > 100) {
            toast.popup('Please enter a number between 1 and 100', 'error');
            return;
        }

        setIsAutoGenerating(true);
        setAutoGenProgress(0);

        try {
            // Generate codes locally
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const generatedCodes = [];
            for (let i = 0; i < numToGenerate; i++) {
                let code = 'SIEGE-';
                for (let j = 0; j < 8; j++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                generatedCodes.push(code);
            }

            // Simulate progress for UI
            for (let i = 1; i <= 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                setAutoGenProgress(i * 10);
            }

            await api.instructor.uploadStudentCodes(generatedCodes);
            toast.popup(`Successfully auto-generated ${numToGenerate} codes!`);
            setPage(1);
            fetchCodes();
            setNumToGenerate(10); // reset
        } catch (error) {
            console.error('Auto-gen failed:', error);
            toast.popup(error.message || 'Failed to auto-generate codes', 'error');
        } finally {
            setIsAutoGenerating(false);
            setTimeout(() => setAutoGenProgress(0), 500); // clear bar eventually
        }
    };

    const toggleSelectAll = () => {
        if (selectedCodes.size === codes.length && codes.length > 0) {
            setSelectedCodes(new Set());
        } else {
            setSelectedCodes(new Set(codes.map(c => c.id)));
        }
    };

    const toggleSelectCode = (id) => {
        const newSet = new Set(selectedCodes);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedCodes(newSet);
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedId(code);
        setTimeout(() => setCopiedId(null), 2000);
        toast.popup('Code copied to clipboard');
    };

    return (
        <div className="space-y-6">
            <style>{`
                .custom-dark-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-dark-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5); 
                    border-radius: 4px;
                }
                .custom-dark-scrollbar::-webkit-scrollbar-thumb {
                    background: #475569; 
                    border-radius: 4px;
                }
                .custom-dark-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #64748b; 
                }
                
                .dark-checkbox {
                    accent-color: #06b6d4;
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }
            `}</style>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-3xl font-black uppercase italic tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Student Codes
                    </h2>
                    <p className={`text-sm tracking-wide mt-1 ${theme === 'dark' ? 'text-cyan-500/80' : 'text-cyan-600'}`}>
                        Manage single-use registration codes for students
                    </p>
                </div>
            </div>

            {/* Progress Bar (Visible during generation) */}
            {isAutoGenerating && (
                <div className="w-full flex justify-center mt-4">
                    <div className="w-full max-w-xs flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-1">Generating... {autoGenProgress}%</span>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-cyan-500 transition-all duration-300" 
                                style={{ width: `${autoGenProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Actions Bar */}
            <div className={`p-6 rounded-2xl border flex flex-col gap-5 transition-colors ${theme === 'dark' ? 'bg-[#0B1224] border-cyan-500/20' : 'bg-white border-slate-200'}`}>
                
                {/* Gen, Upload and Search in one row level */}
                <div className="flex flex-wrap items-center gap-4 w-full">
                    
                    {/* Manual Paste */}
                    <div className="flex-1 min-w-[250px] flex items-center gap-2">
                        <input
                            type="text"
                            value={codesInput}
                            onChange={(e) => setCodesInput(e.target.value)}
                            placeholder="Paste codes here (comma/space separated)..."
                            className={`w-full p-2.5 rounded-xl border transition-colors outline-none focus:border-cyan-500 font-mono text-sm ${theme === 'dark'
                                ? 'bg-slate-900/50 border-white/5 text-white placeholder-slate-600'
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                                }`}
                        />
                        <button
                            onClick={handleUpload}
                            disabled={generating || !codesInput.trim()}
                            className="shrink-0 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[42px]"
                        >
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload
                        </button>
                    </div>

                    {/* Auto Gen */}
                    <div className="flex items-center gap-2 shadow-sm rounded-xl px-2 py-1 border border-purple-500/20 bg-purple-500/5">
                        <input 
                            type="number" 
                            min="1" 
                            max="100" 
                            value={numToGenerate}
                            onChange={(e) => setNumToGenerate(parseInt(e.target.value) || '')}
                            title="Number of codes to generate"
                            className={`w-16 px-2 py-2 rounded-lg border font-bold text-sm outline-none text-center focus:border-purple-500 ${theme === 'dark' ? 'bg-slate-900 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            placeholder="Qty"
                        />
                        <button
                            onClick={handleAutoGen}
                            disabled={isAutoGenerating || typeof numToGenerate !== 'number' || numToGenerate < 1}
                            className="shrink-0 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
                        >
                            {isAutoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Auto-Gen'}
                        </button>
                    </div>

                    {/* Delete Selected (Beside auto gen) */}
                    {selectedCodes.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="shrink-0 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Multi-Delete ({selectedCodes.size})
                        </button>
                    )}

                    {/* Search */}
                    <div className="w-[200px] shrink-0">
                        <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="SEARCH..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border transition-colors outline-none focus:border-cyan-500 font-mono text-sm tracking-wider ${theme === 'dark'
                                    ? 'bg-slate-900/50 border-white/5 text-white placeholder-slate-600'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                                    }`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className={`rounded-2xl border overflow-hidden transition-colors ${theme === 'dark' ? 'bg-[#0B1224] border-cyan-500/20' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-dark-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className={`border-b text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'border-white/5 bg-slate-900/90 backdrop-blur-md text-slate-500' : 'border-slate-200 bg-slate-50/90 backdrop-blur-md text-slate-400'}`}>
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="dark-checkbox" 
                                        checked={codes.length > 0 && selectedCodes.size === codes.length}
                                        onChange={toggleSelectAll}
                                        title="Select All"
                                    />
                                </th>
                                <th className="p-4">Code</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Used By</th>
                                <th className="p-4">Created At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-cyan-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        <p className="text-xs uppercase tracking-widest font-bold">Loading Codes...</p>
                                    </td>
                                </tr>
                            ) : codes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className={`p-8 text-center text-sm font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        No codes found
                                    </td>
                                </tr>
                            ) : (
                                codes.map((code) => (
                                    <motion.tr
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={code.id}
                                        className={`border-b transition-colors ${theme === 'dark' ? 'border-white/5 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'} ${selectedCodes.has(code.id) ? (theme === 'dark' ? 'bg-slate-800/50' : 'bg-cyan-50/50') : ''}`}
                                    >
                                        <td className="p-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="dark-checkbox" 
                                                checked={selectedCodes.has(code.id)}
                                                onChange={() => toggleSelectCode(code.id)}
                                            />
                                        </td>
                                        <td className="p-4 font-mono font-bold tracking-widest flex items-center gap-2 text-cyan-500">
                                            {code.code}
                                            <button
                                                onClick={() => handleCopy(code.code)}
                                                className={`p-1 rounded-md transition-colors ${copiedId === code.code ? 'text-green-500 bg-green-500/10' : theme === 'dark' ? 'text-slate-500 hover:text-cyan-400 hover:bg-slate-800' : 'text-slate-400 hover:text-cyan-600 hover:bg-slate-200'}`}
                                                title="Copy Code"
                                            >
                                                {copiedId === code.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            {code.is_used ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-500 text-xs font-bold uppercase tracking-wider border border-slate-500/20">
                                                    <AlertCircle className="w-3 h-3" /> Used
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                                                    <CheckCircle className="w-3 h-3" /> Available
                                                </span>
                                            )}
                                        </td>
                                        <td className={`p-4 text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {code.used_by ? (
                                                <div>
                                                    <span className={theme === 'dark' ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{code.used_by.username}</span>
                                                    <br />
                                                    <span className="text-xs opacity-70">{code.used_by.email}</span>
                                                </div>
                                            ) : (
                                                <span className="opacity-50">-</span>
                                            )}
                                        </td>
                                        <td className={`p-4 text-xs tracking-wide ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {new Date(code.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDelete(code.id)}
                                                className={`p-2 rounded-lg transition-colors group ${theme === 'dark' ? 'hover:bg-red-500/10 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
                                                title="Delete Code"
                                            >
                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={`p-4 border-t flex justify-center gap-2 ${theme === 'dark' ? 'border-white/5 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(prev => prev - 1)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${theme === 'dark'
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'
                                }`}
                        >
                            Prev
                        </button>
                        <span className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(prev => prev + 1)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${theme === 'dark'
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'
                                }`}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentCodesManager;
