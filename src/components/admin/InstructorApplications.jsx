import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { instructorAPI } from '../../services/api';
import { Check, X, Clock, User, Mail, BookOpen, RefreshCw, AlertCircle } from 'lucide-react';

const InstructorApplications = ({ theme = 'dark' }) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectModal, setRejectModal] = useState({ open: false, id: null });
    const [rejectReason, setRejectReason] = useState('');

    const fetchApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await instructorAPI.getApplications(filter);
            setApplications(response.applications || []);
        } catch (err) {
            console.error('Failed to fetch applications:', err);
            setError('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [filter]);

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await instructorAPI.approveApplication(id);
            // Remove from list or refresh
            setApplications(prev => prev.filter(app => app.id !== id));
        } catch (err) {
            console.error('Failed to approve:', err);
            alert('Failed to approve application: ' + (err.message || 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal.id) return;
        setActionLoading(rejectModal.id);
        try {
            await instructorAPI.rejectApplication(rejectModal.id, rejectReason);
            setApplications(prev => prev.filter(app => app.id !== rejectModal.id));
            setRejectModal({ open: false, id: null });
            setRejectReason('');
        } catch (err) {
            console.error('Failed to reject:', err);
            alert('Failed to reject application: ' + (err.message || 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-3xl font-black italic tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Instructor Applications
                    </h1>
                    <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Review and manage instructor registration requests
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filter Tabs */}
                    <div className={`flex rounded-xl p-1 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
                        {['pending', 'approved', 'rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === status
                                        ? (theme === 'dark' ? 'bg-cyan-500 text-white' : 'bg-cyan-600 text-white')
                                        : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchApplications}
                        className={`p-2.5 rounded-xl border transition-all ${theme === 'dark'
                                ? 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50'
                                : 'bg-white border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-300'
                            }`}
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${theme === 'dark' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`} />
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Loading applications...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && applications.length === 0 && (
                <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                    <Clock className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        No {filter} applications
                    </h3>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {filter === 'pending' ? 'All caught up!' : `No ${filter} applications yet`}
                    </p>
                </div>
            )}

            {/* Applications List */}
            {!loading && applications.length > 0 && (
                <div className="space-y-4">
                    <AnimatePresence>
                        {applications.map((app) => (
                            <motion.div
                                key={app.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`p-6 rounded-2xl border transition-all ${theme === 'dark'
                                        ? 'bg-slate-900/50 border-white/10 hover:border-cyan-500/30'
                                        : 'bg-white border-slate-200 hover:border-cyan-300 shadow-sm'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-50'
                                            }`}>
                                            <User className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} />
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                {app.username}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {app.email}
                                                    </span>
                                                </div>
                                                {app.course && (
                                                    <div className="flex items-center gap-1.5">
                                                        <BookOpen className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            {app.course}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                Applied: {formatDate(app.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {filter === 'pending' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(app.id)}
                                                disabled={actionLoading === app.id}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                <Check className="w-4 h-4" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => setRejectModal({ open: true, id: app.id })}
                                                disabled={actionLoading === app.id}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${theme === 'dark'
                                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                    }`}
                                            >
                                                <X className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </div>
                                    )}

                                    {/* Status Badge for non-pending */}
                                    {filter !== 'pending' && (
                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${app.status === 'approved'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {app.status}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Reject Confirmation Modal */}
            <AnimatePresence>
                {rejectModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className={`w-full max-w-md p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'
                                }`}
                        >
                            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Reject Application
                            </h3>
                            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Optionally provide a reason for rejection (will be stored for records):
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                className={`w-full p-3 rounded-xl border text-sm resize-none h-24 ${theme === 'dark'
                                        ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-500'
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                                    }`}
                            />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        setRejectModal({ open: false, id: null });
                                        setRejectReason('');
                                    }}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading === rejectModal.id}
                                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InstructorApplications;
