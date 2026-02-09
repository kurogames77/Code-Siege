import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const Toast = ({ id, message, type, onClose }) => {
    const isPopup = type === 'popup';

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        error: <AlertCircle className="w-5 h-5 text-rose-400" />,
        info: <Info className="w-5 h-5 text-cyan-400" />,
        popup: <CheckCircle2 className="w-12 h-12 text-emerald-400" />
    };

    const borders = {
        success: 'border-emerald-500/30',
        error: 'border-rose-500/30',
        info: 'border-cyan-500/30',
        popup: 'border-emerald-500/50'
    };

    const backgrounds = {
        success: 'bg-emerald-500/10',
        error: 'bg-rose-500/10',
        info: 'bg-cyan-500/10',
        popup: 'bg-slate-900/90'
    };

    if (isPopup) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            >
                <div className={`flex flex-col items-center gap-4 px-8 py-6 rounded-2xl border ${borders.popup} ${backgrounds.popup} shadow-2xl min-w-[300px]`}>
                    <div className="p-4 rounded-full bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        {icons.popup}
                    </div>
                    <p className="text-xl font-bold text-white text-center">{message}</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg ${borders[type]} ${backgrounds[type]} min-w-[300px] pointer-events-auto`}
        >
            <div className="shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-medium text-white flex-1">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto dismiss
        const duration = type === 'popup' ? 2000 : 3000;
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const value = {
        success: (message) => addToast(message, 'success'),
        error: (message) => addToast(message, 'error'),
        info: (message) => addToast(message, 'info'),
        popup: (message) => addToast(message, 'popup'),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed inset-0 pointer-events-none z-[9999]">
                <AnimatePresence mode="sync">
                    {toasts.filter(t => t.type === 'popup').map((toast) => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={removeToast}
                        />
                    ))}
                </AnimatePresence>
                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <AnimatePresence mode="popLayout">
                        {toasts.filter(t => t.type !== 'popup').map((toast) => (
                            <Toast
                                key={toast.id}
                                {...toast}
                                onClose={removeToast}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </ToastContext.Provider>
    );
};
