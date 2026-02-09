import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMusic } from '../../contexts/MusicContext';
import gameMusic from '../../assets/sounds/gamemusics.mp3';

const MainMusicPlayer = () => {
    const { isMuted, isPaused } = useMusic();
    const location = useLocation();
    const audioRef = useRef(null);

    // Routes where music should play
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

    // Playback Control
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const shouldPlay = !isMuted && !isPaused && isGameRoute();

        if (shouldPlay) {
            // Only call play if paused to avoid promise errors
            if (audio.paused) {
                audio.play().catch(err => console.log('Global music play failed:', err));
            }
        } else {
            audio.pause();
        }
    }, [isMuted, isPaused, location.pathname]);

    // Loop Logic (30s - 180s)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (audio.currentTime >= 180) {
                audio.currentTime = 30;
            }
        };

        const handleLoadedMetadata = () => {
            // Check if we should start at 30 (only if fresh load)
            if (audio.currentTime < 30) {
                audio.currentTime = 30;
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    return (
        <audio
            ref={audioRef}
            src={gameMusic}
            loop
            volume={0.9}
            preload="auto"
        />
    );
};

export default MainMusicPlayer;
