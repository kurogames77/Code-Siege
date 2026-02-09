import React, { createContext, useContext, useState, useEffect } from 'react';

const MusicContext = createContext();

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
};

export const MusicProvider = ({ children }) => {
    // Mute state (persisted)
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('gameMusic_muted');
        return saved === 'true';
    });

    // Pause state (ephemeral, e.g. when lobby is open)
    const [isPaused, setIsPaused] = useState(false);

    // Persist mute state
    useEffect(() => {
        localStorage.setItem('gameMusic_muted', isMuted);
    }, [isMuted]);

    const value = {
        isMuted,
        setIsMuted,
        isPaused,
        setIsPaused
    };

    return (
        <MusicContext.Provider value={value}>
            {children}
        </MusicContext.Provider>
    );
};
