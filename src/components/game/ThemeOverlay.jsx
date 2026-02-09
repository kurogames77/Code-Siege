import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeOverlay = () => {
    const { currentTheme } = useTheme();

    if (!currentTheme.overlay) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
            {currentTheme.overlay === 'snow' && <SnowEffect />}
            {currentTheme.overlay === 'fog' && <FogEffect />}
        </div>
    );
};

const SnowEffect = () => {
    // Generate static snowflakes to avoid heavy re-renders
    const snowflakes = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 5,
        size: 2 + Math.random() * 4
    }));

    return (
        <div className="absolute inset-0">
            {snowflakes.map((flake) => (
                <motion.div
                    key={flake.id}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{
                        y: ['0vh', '100vh'],
                        opacity: [0, 1, 0],
                        x: [0, Math.random() * 50 - 25]  // Slight swaying
                    }}
                    transition={{
                        duration: flake.duration,
                        repeat: Infinity,
                        delay: flake.delay,
                        ease: "linear"
                    }}
                    className="absolute bg-white rounded-full blur-[1px]"
                    style={{
                        left: flake.left,
                        width: flake.size,
                        height: flake.size,
                        boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)'
                    }}
                />
            ))}

            {/* Top Frost Vignette */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent" />
        </div>
    );
};

const FogEffect = () => {
    return (
        <div className="absolute inset-0">
            <motion.div
                animate={{ x: ['-10%', '10%'] }}
                transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                className="absolute bottom-0 left-0 w-[120%] h-[40%] bg-gradient-to-t from-purple-900/20 to-transparent blur-3xl"
            />
            <div className="absolute inset-0 bg-orange-500/5 mix-blend-overlay" />
        </div>
    );
}

export default ThemeOverlay;
