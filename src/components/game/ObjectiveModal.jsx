import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, X } from 'lucide-react';
import Button from '../ui/Button';

const ObjectiveModal = ({ isOpen, onClose, objectives = [] }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-lg relative bg-slate-900/90 border border-white/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.3)]"
                    >
                        {/* Header */}
                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/50 text-primary animate-pulse">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-black text-white italic tracking-wider font-galsb uppercase">
                                LEVEL OBJECTIVE
                            </h2>
                            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full mt-4" />
                        </div>

                        {/* Objectives List */}
                        <div className="space-y-4 mb-8">
                            {objectives.map((obj, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 + 0.3 }}
                                    className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10"
                                >
                                    <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                                    <span className="text-lg text-slate-200 font-medium">{obj}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Action */}
                        <div className="flex justify-center">
                            <Button
                                onClick={onClose}
                                className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-dark hover:to-indigo-800 py-4 text-xl tracking-widest"
                            >
                                START LEARNING
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ObjectiveModal;
