import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';

const PuzzleBlock = ({ id, content, type, position, variant = 'jigsaw', connectors: propConnectors, isGlowing = false }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

    // Determinstic random configuration for connectors
    // 0: none, 1: out (tab), 2: in (slot)
    const connectors = useMemo(() => {
        // If connectors are explicitly provided (e.g. from AI or block generator), use them
        if (propConnectors) {
            return propConnectors;
        }

        // Use a seeded random generator for consistency based on ID
        const seedStr = id + content;
        let h = 0xdeadbeef;
        for (let i = 0; i < seedStr.length; i++)
            h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);

        const rand = () => {
            h = Math.imul(h ^ h >>> 16, 2246822507);
            h = Math.imul(h ^ h >>> 13, 3266489909);
            return ((h ^= h >>> 16) >>> 0) / 4294967296;
        };

        // Helper to get random 1 (Tab) or 2 (Slot), never 0
        const getConnector = () => (rand() > 0.5 ? 1 : 2);

        // Default: Grooves everywhere, all dynamically generated
        return {
            top: getConnector(),
            bottom: getConnector(),
            left: getConnector(),
            right: getConnector()
        };
    }, [id, content]);

    const style = transform ? {
        transform: `translate3d(${transform.x + (position?.x || 0)}px, ${transform.y + (position?.y || 0)}px, 0)`,
        zIndex: 100,
    } : {
        transform: `translate3d(${position?.x || 0}px, ${position?.y || 0}px, 0)`,
    };

    // Randomized block colors - each block gets a unique vibrant color
    const blockColors = useMemo(() => {
        const COLOR_PALETTE = [
            { from: '#f43f5e', to: '#e11d48' }, // Rose
            { from: '#a855f7', to: '#9333ea' }, // Purple
            { from: '#22d3ee', to: '#0891b2' }, // Cyan
            { from: '#10b981', to: '#059669' }, // Emerald
            { from: '#3b82f6', to: '#2563eb' }, // Blue
            { from: '#f59e0b', to: '#d97706' }, // Amber
            { from: '#ec4899', to: '#db2777' }, // Pink
            { from: '#8b5cf6', to: '#7c3aed' }, // Violet
            { from: '#14b8a6', to: '#0d9488' }, // Teal
            { from: '#ef4444', to: '#dc2626' }, // Red
            { from: '#06b6d4', to: '#0284c7' }, // Sky
            { from: '#84cc16', to: '#65a30d' }, // Lime
        ];
        // Seeded index from block id for consistent random color per block
        let hash = 0;
        const seed = String(id);
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
        }
        const idx = Math.abs(hash) % COLOR_PALETTE.length;
        return COLOR_PALETTE[idx];
    }, [id]);
    // Fixed width to match snapping/chain detection constants (BLOCK_WIDTH=140)
    const width = 140;
    const height = 48;
    const tabRadius = 10;
    const tabDepth = 12;

    // Smart font size: scale down progressively for longer content
    const getFontSize = (text) => {
        const len = text.length;
        if (len <= 10) return 13;
        if (len <= 16) return 11;
        if (len <= 22) return 9.5;
        if (len <= 30) return 8;
        return 7;
    };

    // Truncate display text to fit within the block
    const getDisplayText = (text) => {
        const len = text.length;
        if (len <= 22) return text;
        if (len <= 30) return text;
        return text.substring(0, 28) + '…';
    };

    // Generate SVG Path with "Cooler" Angular Grooves or Simple Rect
    const generatePath = () => {
        // If variant is brick, return simple rectangle
        if (variant === 'brick') {
            return `M 0,0 H ${width} V ${height} H 0 Z`;
        }

        let p = `M 0,0`;
        const midX = width / 2;
        const midY = height / 2;

        // Groove Dimensions
        const gHalfWidth = 14;  // Half width of the connector base
        const gTipWidth = 8;    // Half width of the connector tip
        const gDepth = 12;      // Depth of protrusion/intrusion

        // Top edge
        if (connectors.top === 1) { // Out (Tab) -> Sticks UP (y < 0)
            p += ` H ${midX - gHalfWidth} L ${midX - gTipWidth},${-gDepth} H ${midX + gTipWidth} L ${midX + gHalfWidth},0 H ${width}`;
        } else if (connectors.top === 2) { // In (Slot) -> cuts DOWN (y > 0)
            p += ` H ${midX - gHalfWidth} L ${midX - gTipWidth},${gDepth} H ${midX + gTipWidth} L ${midX + gHalfWidth},0 H ${width}`;
        } else {
            p += ` H ${width}`;
        }

        // Right edge
        if (connectors.right === 1) { // Out (Tab) -> Sticks RIGHT (x > width)
            p += ` V ${midY - gHalfWidth} L ${width + gDepth},${midY - gTipWidth} V ${midY + gTipWidth} L ${width},${midY + gHalfWidth} V ${height}`;
        } else if (connectors.right === 2) { // In (Slot) -> cuts LEFT (x < width)
            p += ` V ${midY - gHalfWidth} L ${width - gDepth},${midY - gTipWidth} V ${midY + gTipWidth} L ${width},${midY + gHalfWidth} V ${height}`;
        } else {
            p += ` V ${height}`;
        }

        // Bottom edge
        if (connectors.bottom === 1) { // Out (Tab) -> Sticks DOWN (y > height)
            p += ` H ${midX + gHalfWidth} L ${midX + gTipWidth},${height + gDepth} H ${midX - gTipWidth} L ${midX - gHalfWidth},${height} H 0`;
        } else if (connectors.bottom === 2) { // In (Slot) -> cuts UP (y < height)
            p += ` H ${midX + gHalfWidth} L ${midX + gTipWidth},${height - gDepth} H ${midX - gTipWidth} L ${midX - gHalfWidth},${height} H 0`;
        } else {
            p += ` H 0`;
        }

        // Left edge
        if (connectors.left === 1) { // Out (Tab) -> Sticks LEFT (x < 0)
            p += ` V ${midY + gHalfWidth} L ${-gDepth},${midY + gTipWidth} V ${midY - gTipWidth} L 0,${midY - gHalfWidth} Z`;
        } else if (connectors.left === 2) { // In (Slot) -> cuts RIGHT (x > 0)
            p += ` V ${midY + gHalfWidth} L ${gDepth},${midY + gTipWidth} V ${midY - gTipWidth} L 0,${midY - gHalfWidth} Z`;
        } else {
            p += ` Z`;
        }

        return p;
    };

    const path = generatePath();

    // Simple trapezoidal jigsaw piece using clip-path variants
    // Note: In a real app, complex SVG paths are better, but we'll approximate with clip-path blocks
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="puzzle-block absolute cursor-grab active:cursor-grabbing select-none group"
            title={content}
        >
            <svg
                width={width + tabDepth * 2}
                height={height + tabDepth * 2}
                viewBox={`-${tabDepth} -${tabDepth} ${width + tabDepth * 2} ${height + tabDepth * 2}`}
                className="drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300"
                style={isGlowing ? { filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.8)) drop-shadow(0 0 24px rgba(34,211,238,0.4))' } : {}}
            >
                <defs>
                    <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: blockColors.from, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: blockColors.to, stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id={`shadow-${id}`}>
                        <feInnerShadow dx="0" dy="1" blur="2" color="rgba(255,255,255,0.2)" />
                    </filter>
                </defs>

                {/* Main Block Path */}
                <path
                    d={path}
                    fill={`url(#grad-${id})`}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                    className="transition-colors duration-300"
                />

                {/* Clip to block shape to prevent overflow */}
                <clipPath id={`clip-${id}`}>
                    <rect x="4" y="2" width={width - 8} height={height - 4} />
                </clipPath>

                {/* Content Text */}
                <text
                    x={width / 2}
                    y={height / 2}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="white"
                    clipPath={`url(#clip-${id})`}
                    className="font-mono font-bold pointer-events-none"
                    style={{
                        fontSize: `${getFontSize(content)}px`,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                    }}
                >
                    {getDisplayText(content)}
                </text>
            </svg>
        </div>
    );
};

export default PuzzleBlock;
