import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '../../contexts/MusicContext';
import { useLocation } from 'react-router-dom';

const GlobalAudioControl = () => {
    const { isMuted, setIsMuted } = useMusic();
    const [isHovered, setIsHovered] = useState(false);
    const location = useLocation();

    // Only show on game routes (matches MainMusicPlayer logic)
    const isGameRoute = () => {
        const path = location.pathname;
        return (
            path.startsWith('/play') ||
            path.startsWith('/tower') ||
            path.startsWith('/gamecode') ||
            path.startsWith('/arena-battle') ||
            path.startsWith('/grand-arena')
        );
    };

    if (!isGameRoute()) return null;

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        <div
            className="fixed bottom-10 left-10 z-[60] flex items-center gap-3"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                onClick={toggleMute}
                className={`p-3 rounded-full backdrop-blur-md border transition-all duration-300 shadow-lg group ${isMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white'
                    : 'bg-slate-900/50 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    }`}
            >
                <AnimatePresence mode="wait">
                    {isMuted ? (
                        <motion.div
                            key="muted"
                            initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 0.5, rotate: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <VolumeX className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="unmuted"
                            initial={{ scale: 0.5, rotate: 20, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 0.5, rotate: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Volume2 className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>


        </div>
    );
};

export default GlobalAudioControl;
