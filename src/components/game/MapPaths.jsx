import React from 'react';
import { motion } from 'framer-motion';

const MapPaths = ({ positions, towers }) => {
    if (positions.length < 2) return null;

    // Helper to generate curve path string for a single segment
    const getSegmentPath = (start, end) => {
        const cp1x = start.x + (end.x - start.x) * 0.5;
        const cp1y = start.y;
        const cp2x = start.x + (end.x - start.x) * 0.5;
        const cp2y = end.y;
        return `M ${start.x},${start.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${end.x},${end.y}`;
    };

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
            <defs>
                {/* Glow Filter for the liquid - Enhanced Aura */}
                <filter id="liquid-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Gradient for the pipe body (Grey) */}
                <linearGradient id="pipe-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4b5563" />
                    <stop offset="50%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>

                {/* Gradient for the liquid (Purple with Aura) */}
                <linearGradient id="liquid-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />   {/* Purple-400 */}
                    <stop offset="100%" stopColor="#a855f7" /> {/* Purple-500 */}
                </linearGradient>
            </defs>

            {positions.map((currentPos, i) => {
                // Stop at the last point
                if (i === positions.length - 1) return null;

                const nextPos = positions[i + 1];
                const pathData = getSegmentPath(currentPos, nextPos);

                const isCompleted = towers[i]?.current === towers[i]?.total && towers[i]?.total > 0;

                return (
                    <g key={i}>
                        {/* 1. Base Pipe (Background) */}
                        <path
                            d={pathData}
                            fill="none"
                            stroke="url(#pipe-gradient)"
                            strokeWidth="24"
                            strokeLinecap="round"
                            className="drop-shadow-lg"
                        />

                        {/* 2. Inner Pipe groove (Detail) */}
                        <path
                            d={pathData}
                            fill="none"
                            stroke="#1f2937"
                            strokeWidth="16"
                            strokeLinecap="round"
                        />

                        {/* 3. Fluid Layer (Animated) */}
                        {isCompleted && (
                            <>
                                {/* Core Fluid */}
                                <motion.path
                                    d={pathData}
                                    fill="none"
                                    stroke="url(#liquid-gradient)"
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    filter="url(#liquid-glow)"
                                />

                                {/* Flowing Ripples / Bubbles */}
                                <motion.path
                                    d={pathData}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray="10 20"
                                    strokeOpacity="0.5"
                                    initial={{ pathLength: 0, strokeDashoffset: 0 }}
                                    animate={{
                                        pathLength: 1,
                                        strokeDashoffset: -100 // Move dashes to simulate flow
                                    }}
                                    transition={{
                                        pathLength: { duration: 1.5, ease: "easeInOut" },
                                        strokeDashoffset: { duration: 2, repeat: Infinity, ease: "linear" }
                                    }}
                                />
                            </>
                        )}

                        {/* 4. Connector Joint at the start node (to hide seams) - Matching Grey Pipe */}
                        <circle cx={currentPos.x} cy={currentPos.y} r="14" fill="#6b7280" stroke="#4b5563" strokeWidth="4" />
                    </g>
                );
            })}
        </svg>
    );
};

export default MapPaths;
