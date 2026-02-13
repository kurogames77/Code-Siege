import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const CodeTimer = ({ initialTime = 600, onExpire, onWarning }) => {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    useEffect(() => {
        if (timeLeft <= 0) {
            onExpire?.();
            return;
        }

        // Trigger warning at exactly 10 seconds
        if (timeLeft === 10) {
            onWarning?.();
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onExpire, onWarning]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isWarning = timeLeft <= 30;
    const isCritical = timeLeft <= 10;

    return (
        <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-bold border tracking-wider transition-all duration-300 relative overflow-hidden group
            ${isCritical
                ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                : isWarning
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    : 'bg-cyan-900/20 text-cyan-400 border-cyan-500/20'}
            font-galsb
        `}>
            {/* Glitch Overlay for Critical */}
            {isCritical && (
                <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay animate-ping" />
            )}

            <Clock className={`w-5 h-5 ${isCritical ? 'animate-spin' : ''}`} />
            <span className="relative z-10 tabular-nums">{formatTime(timeLeft)}</span>
        </div>
    );
};

export default CodeTimer;
