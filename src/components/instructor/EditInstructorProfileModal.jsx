import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Crown, ShieldCheck, Mail, Hash } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

const EditInstructorProfileModal = ({ isOpen, onClose, currentProfile }) => {
    const { user, updateProfile, updateAvatar } = useUser();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [instructorId, setInstructorId] = useState('');
    const [role, setRole] = useState('Instructor');
    const [isLoading, setIsLoading] = useState(false);

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            // Use user context data if available, otherwise currentProfile
            setName(user?.name || currentProfile?.name || '');
            setEmail(user?.email || '');
            // user.studentId is used for Instructor ID in this system
            setInstructorId(user?.studentId || '');
            setRole('Instructor');

            if (user?.avatar || currentProfile?.image) {
                setImagePreview(user?.avatar || currentProfile?.image);
            }
        }
    }, [isOpen, currentProfile, user]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file); // Store the File object
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (name !== user.name) {
                await updateProfile({
                    name,
                });
            }

            if (image) {
                await updateAvatar(image); // image is now a File object
            }

            onClose();
        } catch (error) {
            console.error('Failed to update profile:', error);
            setError(error.message || 'Failed to update profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-galsb">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md bg-[#0B1224] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase italic tracking-wider">
                                        Edit Profile
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Instructor Details
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Profile Picture Upload */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/20 bg-slate-900/50 flex items-center justify-center overflow-hidden transition-all group-hover:border-cyan-500 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-[8px] font-black uppercase text-white tracking-widest">Change</span>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center border-4 border-[#0B1224] shadow-lg z-10">
                                        <div className="text-white text-xs">+</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Full Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all font-bold tracking-wide"
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all font-bold tracking-wide"
                                        placeholder="Enter email address"
                                        readOnly
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-slate-600">
                                        LOCKED
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Instructor ID
                                </label>
                                <div className="relative group">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    <input
                                        type="text"
                                        value={instructorId}
                                        onChange={(e) => setInstructorId(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all font-bold tracking-wide"
                                        placeholder="Enter instructor ID"
                                        readOnly
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-slate-600">
                                        LOCKED
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    System Role
                                </label>
                                <div className="relative group opacity-60">
                                    <Crown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        value="Instructor"
                                        readOnly
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-slate-400 cursor-not-allowed font-bold tracking-wide uppercase"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-slate-600">
                                        LOCKED
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Footer Actions */}
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-cyan-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EditInstructorProfileModal;
