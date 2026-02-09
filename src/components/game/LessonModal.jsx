import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle } from 'lucide-react';

const LessonModal = ({ isOpen, onStart, objectives = [] }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-lg relative bg-[#0B0F19] border border-white/10 rounded-3xl p-8 shadow-[0_0_80px_rgba(168,85,247,0.15)] ring-1 ring-white/5"
                    >
                        {/* Header Section */}
                        <div className="text-center mb-8">
                            <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/50 border border-white/10 flex items-center justify-center mb-4">
                                <BookOpen className="w-5 h-5 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white italic tracking-wide font-galsb uppercase">
                                LEVEL OBJECTIVE
                            </h2>
                            <div className="w-10 h-0.5 bg-purple-500/50 mx-auto mt-2 rounded-full" />
                        </div>

                        {/* Objectives List */}
                        <div className="bg-slate-900/50 rounded-xl p-1 space-y-1 mb-8">
                            {objectives.length > 0 ? objectives.map((obj, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg border border-white/5">
                                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span className="text-slate-200 font-medium text-sm">
                                        {typeof obj === 'string' ? obj : obj.text}
                                    </span>
                                </div>
                            )) : (
                                <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg border border-white/5">
                                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span className="text-slate-200 font-medium text-sm">Master the basic syntax</span>
                                </div>
                            )}
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={onStart}
                            className="w-full py-4 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(109,40,217,0.4)] hover:shadow-[0_0_30px_rgba(109,40,217,0.6)]"
                        >
                            Start Learning
                        </button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LessonModal;
