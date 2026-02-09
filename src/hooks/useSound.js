import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for playing UI sound effects using Web Audio API
 * Generates synthetic sounds that match the game's sci-fi theme
 */
const useSound = () => {
    const audioContextRef = useRef(null);
    const isMutedRef = useRef(false);

    // Initialize AudioContext
    useEffect(() => {
        // Check mute state from localStorage
        const sfxMuted = localStorage.getItem('sfx_muted');
        isMutedRef.current = sfxMuted === 'true';

        // Create AudioContext lazily on first interaction
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
        };

        document.addEventListener('click', initAudio, { once: true });
        return () => document.removeEventListener('click', initAudio);
    }, []);

    // Base sound generator
    const playTone = useCallback((frequency, duration, type = 'sine', volume = 0.3) => {
        if (isMutedRef.current) return;

        const ctx = audioContextRef.current;
        if (!ctx) return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }, []);

    // Standard click sound - short, crisp
    const playClick = useCallback(() => {
        if (isMutedRef.current) return;

        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Two-tone click for depth
        playTone(800, 0.05, 'sine', 0.2);
        setTimeout(() => playTone(1200, 0.03, 'sine', 0.15), 20);
    }, [playTone]);

    // Success sound - ascending tones
    const playSuccess = useCallback(() => {
        if (isMutedRef.current) return;

        const ctx = audioContextRef.current;
        if (!ctx) return;

        playTone(600, 0.08, 'sine', 0.25);
        setTimeout(() => playTone(800, 0.08, 'sine', 0.2), 60);
        setTimeout(() => playTone(1000, 0.1, 'sine', 0.15), 120);
    }, [playTone]);

    // Cancel/negative sound - descending tone
    const playCancel = useCallback(() => {
        if (isMutedRef.current) return;

        const ctx = audioContextRef.current;
        if (!ctx) return;

        playTone(700, 0.08, 'sine', 0.2);
        setTimeout(() => playTone(400, 0.12, 'sine', 0.15), 50);
    }, [playTone]);

    // Selection sound - single clean tone
    const playSelect = useCallback(() => {
        if (isMutedRef.current) return;

        const ctx = audioContextRef.current;
        if (!ctx) return;

        playTone(1000, 0.06, 'sine', 0.2);
    }, [playTone]);

    // Connect sound - satisfying snap when pieces connect
    const playConnect = useCallback(() => {
        if (isMutedRef.current) return;

        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Quick double-blip with slight pitch variation
        playTone(1200, 0.04, 'sine', 0.25);
        setTimeout(() => playTone(1400, 0.03, 'sine', 0.2), 30);
    }, [playTone]);

    // Hover sound - very subtle
    const playHover = useCallback(() => {
        if (isMutedRef.current) return;

        const ctx = audioContextRef.current;
        if (!ctx) return;

        playTone(600, 0.03, 'sine', 0.1);
    }, [playTone]);

    // Countdown voice using Speech Synthesis
    const playCountdownVoice = useCallback((text) => {
        if (isMutedRef.current) return;

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Find a suitable sci-fi voice (Google US English or similar)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang === 'en-US') || voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.pitch = 0.5; // Lower pitch for sci-fi feel
        utterance.rate = 1.1;  // Slightly faster for urgency
        utterance.volume = 0.6;

        window.speechSynthesis.speak(utterance);
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        isMutedRef.current = !isMutedRef.current;
        localStorage.setItem('sfx_muted', isMutedRef.current);
        return isMutedRef.current;
    }, []);

    // Get mute state
    const isMuted = useCallback(() => {
        return isMutedRef.current;
    }, []);

    return {
        playClick,
        playSuccess,
        playCancel,
        playSelect,
        playConnect,
        playHover,
        playCountdownVoice,
        toggleMute,
        isMuted
    };
};

export default useSound;
