import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeOverlay = () => {
    const { currentTheme } = useTheme();

    if (!currentTheme.overlay) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
            {currentTheme.overlay === 'snow' && <SnowEffect />}
            {currentTheme.overlay === 'christmas' && <ChristmasEffect />}
            {currentTheme.overlay === 'fog' && <FogEffect />}
        </div>
    );
};

// ═══════════════════════════════════════════
//  ❄️  WINTER FROST — Snowflakes & Ice
// ═══════════════════════════════════════════
const SnowEffect = () => {
    const snowflakes = useMemo(() =>
        Array.from({ length: 60 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 8,
            size: 2 + Math.random() * 5,
            opacity: 0.3 + Math.random() * 0.7,
            sway: (Math.random() - 0.5) * 80,
        })), []);

    const iceParticles = useMemo(() =>
        Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: 1 + Math.random() * 2,
            delay: Math.random() * 6,
        })), []);

    return (
        <div className="absolute inset-0">
            {/* Falling Snowflakes */}
            {snowflakes.map((flake) => (
                <motion.div
                    key={flake.id}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{
                        y: ['0vh', '105vh'],
                        opacity: [0, flake.opacity, flake.opacity, 0],
                        x: [0, flake.sway, 0],
                        rotate: [0, 360]
                    }}
                    transition={{
                        duration: flake.duration,
                        repeat: Infinity,
                        delay: flake.delay,
                        ease: "linear"
                    }}
                    className="absolute rounded-full"
                    style={{
                        left: flake.left,
                        width: flake.size,
                        height: flake.size,
                        background: 'radial-gradient(circle, #ffffff, #a5d8ff)',
                        boxShadow: `0 0 ${flake.size * 2}px rgba(165, 216, 255, 0.6), 0 0 ${flake.size * 4}px rgba(165, 216, 255, 0.3)`,
                    }}
                />
            ))}

            {/* Floating Ice Sparkles */}
            {iceParticles.map((p) => (
                <motion.div
                    key={`ice-${p.id}`}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0.5, 1.2, 0.5],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 3,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "easeInOut"
                    }}
                    className="absolute"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        background: '#fff',
                        borderRadius: '50%',
                        boxShadow: '0 0 6px #a5d8ff, 0 0 12px #74c0fc',
                    }}
                />
            ))}

            {/* Top Frost Vignette */}
            <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-sky-400/8 to-transparent" />

            {/* Bottom frost shimmer */}
            <motion.div
                animate={{ opacity: [0.03, 0.08, 0.03] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-sky-300/10 to-transparent blur-xl"
            />

            {/* Side frost edges */}
            <div className="absolute top-0 left-0 w-16 h-full bg-gradient-to-r from-sky-300/5 to-transparent" />
            <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-sky-300/5 to-transparent" />
        </div>
    );
};

// ═══════════════════════════════════════════
//  🎄  SANTA'S WORKSHOP — Gifts & Lights
// ═══════════════════════════════════════════
const ChristmasEffect = () => {
    // Twinkling string lights
    const lights = useMemo(() =>
        Array.from({ length: 25 }).map((_, i) => ({
            id: i,
            left: `${(i / 25) * 100 + (Math.random() * 4 - 2)}%`,
            color: ['#ff4444', '#44ff44', '#ffdd44', '#ff4444', '#44aaff'][i % 5],
            delay: Math.random() * 3,
            size: 5 + Math.random() * 4,
        })), []);

    // Gentle falling sparkles (like glitter)
    const sparkles = useMemo(() =>
        Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: Math.random() * 10,
            duration: 8 + Math.random() * 6,
            size: 1.5 + Math.random() * 2.5,
            color: ['#ff6b6b', '#51cf66', '#ffd43b', '#ff922b'][Math.floor(Math.random() * 4)],
            sway: (Math.random() - 0.5) * 60,
        })), []);

    // Floating ornament stars
    const stars = useMemo(() =>
        Array.from({ length: 8 }).map((_, i) => ({
            id: i,
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            delay: Math.random() * 5,
            size: 3 + Math.random() * 4,
        })), []);

    return (
        <div className="absolute inset-0">
            {/* String Lights along top */}
            <div className="absolute top-0 left-0 w-full h-20">
                {/* Wire/string */}
                <svg className="absolute top-3 left-0 w-full h-12 opacity-20" viewBox="0 0 1000 40" preserveAspectRatio="none">
                    <path d="M0,5 Q50,35 100,5 Q150,35 200,5 Q250,35 300,5 Q350,35 400,5 Q450,35 500,5 Q550,35 600,5 Q650,35 700,5 Q750,35 800,5 Q850,35 900,5 Q950,35 1000,5"
                        fill="none" stroke="#4a5568" strokeWidth="1.5" />
                </svg>
                {lights.map((light) => (
                    <motion.div
                        key={`light-${light.id}`}
                        animate={{
                            opacity: [0.4, 1, 0.4],
                            scale: [0.9, 1.1, 0.9],
                        }}
                        transition={{
                            duration: 1.5 + Math.random() * 2,
                            repeat: Infinity,
                            delay: light.delay,
                            ease: "easeInOut"
                        }}
                        style={{
                            left: light.left,
                            top: `${8 + Math.sin(light.id * 0.7) * 6}px`,
                            width: light.size,
                            height: light.size * 1.3,
                            borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                            background: light.color,
                            boxShadow: `0 0 ${light.size * 2}px ${light.color}, 0 0 ${light.size * 4}px ${light.color}40`,
                        }}
                        className="absolute"
                    />
                ))}
            </div>

            {/* Falling Glitter */}
            {sparkles.map((s) => (
                <motion.div
                    key={`sparkle-${s.id}`}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{
                        y: ['0vh', '105vh'],
                        opacity: [0, 0.8, 0.8, 0],
                        x: [0, s.sway],
                        rotate: [0, 720],
                    }}
                    transition={{
                        duration: s.duration,
                        repeat: Infinity,
                        delay: s.delay,
                        ease: "linear",
                    }}
                    className="absolute"
                    style={{
                        left: s.left,
                        width: s.size,
                        height: s.size,
                        background: s.color,
                        borderRadius: '1px',
                        boxShadow: `0 0 4px ${s.color}`,
                    }}
                />
            ))}

            {/* Floating Stars */}
            {stars.map((star) => (
                <motion.div
                    key={`star-${star.id}`}
                    animate={{
                        opacity: [0.2, 0.8, 0.2],
                        scale: [0.8, 1.2, 0.8],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 5 + Math.random() * 4,
                        repeat: Infinity,
                        delay: star.delay,
                        ease: "easeInOut",
                    }}
                    className="absolute"
                    style={{
                        left: star.left,
                        top: star.top,
                        width: star.size,
                        height: star.size,
                        background: '#ffd43b',
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                        filter: 'drop-shadow(0 0 4px #ffd43b)',
                    }}
                />
            ))}

            {/* Warm red/green ambient glow */}
            <motion.div
                animate={{ opacity: [0.02, 0.06, 0.02] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-red-500/8 to-transparent"
            />
            <motion.div
                animate={{ opacity: [0.02, 0.06, 0.02] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-green-500/8 to-transparent"
            />

            {/* Bottom warm glow */}
            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-amber-500/5 to-transparent" />
        </div>
    );
};

// ═══════════════════════════════════════════
//  🎃  SPOOKY HOLLOW — Fog, Ghosts & Embers
// ═══════════════════════════════════════════
const FogEffect = () => {
    // Floating ghost wisps
    const ghosts = useMemo(() =>
        Array.from({ length: 6 }).map((_, i) => ({
            id: i,
            startX: Math.random() * 100,
            y: 30 + Math.random() * 50,
            duration: 15 + Math.random() * 10,
            delay: Math.random() * 10,
            size: 20 + Math.random() * 30,
        })), []);

    // Floating embers / souls
    const embers = useMemo(() =>
        Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 6,
            size: 1.5 + Math.random() * 2.5,
            color: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#f97316' : '#22c55e',
        })), []);

    // Floating pumpkin-like orbs
    const orbs = useMemo(() =>
        Array.from({ length: 4 }).map((_, i) => ({
            id: i,
            left: `${15 + Math.random() * 70}%`,
            top: `${20 + Math.random() * 60}%`,
            delay: Math.random() * 6,
            size: 6 + Math.random() * 6,
        })), []);

    return (
        <div className="absolute inset-0">
            {/* Drifting Fog Layers */}
            <motion.div
                animate={{ x: ['-15%', '15%'] }}
                transition={{ duration: 25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                className="absolute bottom-0 left-0 w-[130%] h-[45%] bg-gradient-to-t from-purple-900/15 via-purple-800/8 to-transparent blur-3xl"
            />
            <motion.div
                animate={{ x: ['10%', '-10%'] }}
                transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 5 }}
                className="absolute bottom-0 right-0 w-[120%] h-[35%] bg-gradient-to-t from-orange-900/10 via-purple-900/5 to-transparent blur-3xl"
            />

            {/* Ghost Wisps - semi-transparent shapes that drift */}
            {ghosts.map((g) => (
                <motion.div
                    key={`ghost-${g.id}`}
                    animate={{
                        x: [`${g.startX}vw`, `${g.startX + 30}vw`, `${g.startX}vw`],
                        y: [0, -15, 5, -10, 0],
                        opacity: [0, 0.04, 0.06, 0.03, 0],
                    }}
                    transition={{
                        duration: g.duration,
                        repeat: Infinity,
                        delay: g.delay,
                        ease: "easeInOut",
                    }}
                    className="absolute rounded-full blur-2xl"
                    style={{
                        top: `${g.y}%`,
                        width: g.size,
                        height: g.size * 1.5,
                        background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.4), transparent 70%)',
                    }}
                />
            ))}

            {/* Rising Embers/Souls */}
            {embers.map((e) => (
                <motion.div
                    key={`ember-${e.id}`}
                    initial={{ y: '100vh', opacity: 0 }}
                    animate={{
                        y: ['100vh', '-5vh'],
                        opacity: [0, 0.7, 0.7, 0],
                        x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60],
                    }}
                    transition={{
                        duration: e.duration,
                        repeat: Infinity,
                        delay: e.delay,
                        ease: "linear",
                    }}
                    className="absolute rounded-full"
                    style={{
                        left: e.left,
                        width: e.size,
                        height: e.size,
                        background: e.color,
                        boxShadow: `0 0 ${e.size * 3}px ${e.color}, 0 0 ${e.size * 6}px ${e.color}40`,
                    }}
                />
            ))}

            {/* Pumpkin Orbs - soft glowing orange dots */}
            {orbs.map((orb) => (
                <motion.div
                    key={`orb-${orb.id}`}
                    animate={{
                        opacity: [0.1, 0.35, 0.1],
                        scale: [0.9, 1.15, 0.9],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 3,
                        repeat: Infinity,
                        delay: orb.delay,
                        ease: "easeInOut",
                    }}
                    className="absolute rounded-full"
                    style={{
                        left: orb.left,
                        top: orb.top,
                        width: orb.size,
                        height: orb.size,
                        background: 'radial-gradient(circle, #f97316, #ea580c 50%, transparent 70%)',
                        boxShadow: '0 0 15px rgba(249, 115, 22, 0.4), 0 0 30px rgba(249, 115, 22, 0.2)',
                    }}
                />
            ))}

            {/* Eerie ambient overlay */}
            <div className="absolute inset-0 bg-orange-500/3 mix-blend-overlay" />

            {/* Dark vignette edges */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />
        </div>
    );
};

export default ThemeOverlay;
