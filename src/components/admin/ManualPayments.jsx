import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Search, RefreshCw, Send } from 'lucide-react';
import { paymentsAPI, userAPI } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { useUser } from '../../../contexts/UserContext';
import gemIcon from '../../../assets/gem.png';

const ManualPayments = () => {
    const { user } = useUser();
    const { success, error: toastError } = useToast();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const statusFilter = filter === 'all' ? '' : filter;
            const res = await paymentsAPI.getManualPayments(statusFilter);
            setPayments(res.data || []);
        } catch (err) {
            console.error("Failed to fetch payments:", err);
            toastError("Failed to load manual payments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [filter]);

    const handleUpdateStatus = async (id, newStatus) => {
        if (!confirm(`Are you sure you want to mark this payment as ${newStatus}?`)) return;
        setProcessing(true);
        try {
            await paymentsAPI.updatePaymentStatus(id, newStatus, user.id);
            success(`Payment marked as ${newStatus}`);
            fetchPayments();
        } catch (err) {
            console.error(`Failed to ${newStatus} payment:`, err);
            toastError(`Failed to mark payment as ${newStatus}`);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'rejected': return <XCircle className="w-5 h-5 text-rose-500" />;
            case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
            default: return null;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
            case 'rejected': return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/30';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-1 flex items-center gap-2">
                         Payment Verification
                    </h2>
                    <p className="text-slate-400 font-bold">Review and approve GCash reference numbers here.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchPayments}
                        disabled={loading}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                    >
                        <option value="pending">Pending Only</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="all">All Payments</option>
                    </select>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 border-b border-white/10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest pl-6">Date</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Player</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Amount PHP</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Gems</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Reference #</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && payments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500 font-bold animate-pulse">
                                        Loading payments...
                                    </td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500 font-bold">
                                        No manual payments found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        key={payment.id}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="text-white font-bold">{new Date(payment.created_at).toLocaleDateString()}</div>
                                            <div className="text-xs text-slate-500">{new Date(payment.created_at).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-cyan-400 font-bold">{payment.users?.username || 'Unknown'}</span>
                                                <span className="text-xs text-slate-500">{payment.users?.email || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black tracking-widest">
                                                ₱ {payment.amount}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-amber-400 font-black">{payment.gems}</span>
                                                <img src={gemIcon} alt="gem" className="w-4 h-4" />
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-white font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 tracking-widest">
                                                {payment.reference_number}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest ${getStatusColor(payment.status)}`}>
                                                {getStatusIcon(payment.status)}
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            {payment.status === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        disabled={processing}
                                                        onClick={() => handleUpdateStatus(payment.id, 'approved')}
                                                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        disabled={processing}
                                                        onClick={() => handleUpdateStatus(payment.id, 'rejected')}
                                                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                                    Processed
                                                </span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManualPayments;
