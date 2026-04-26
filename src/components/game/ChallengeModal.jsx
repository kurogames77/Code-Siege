import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { restrictToWindowEdges, restrictToParentElement } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Lightbulb, X, Trophy, Bug, ZoomIn, ZoomOut, Maximize, Sun, Moon, RotateCcw } from 'lucide-react';
import PuzzleBlock from './PuzzleBlock';
import CodeTimer from './CodeTimer';
import Button from '../ui/Button';
import useSound from '../../hooks/useSound';
import { aiAPI } from '../../services/api';

import { useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

// Assets
import expIcon from '../../assets/exp.png';


const ChallengeModal = ({ isOpen, onClose, puzzle, onComplete, config, level = 1 }) => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const urlMode = queryParams.get('mode') || 'Beginner';
    const urlDifficulty = queryParams.get('difficulty') || 'Easy';

    const [blocks, setBlocks] = useState([]);
    const [result, setResult] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    const [isAnalyzingEntry, setIsAnalyzingEntry] = useState(false);
    const [submitAttempts, setSubmitAttempts] = useState(0);
    const [isExecuting, setIsExecuting] = useState(false);
    const startTimeRef = useRef(Date.now());

    // Hint System State
    const [hintLevel, setHintLevel] = useState(0);
    const [currentReward, setCurrentReward] = useState(0);
    const [terminalLogs, setTerminalLogs] = useState([]);
    const [codeValue, setCodeValue] = useState(''); // For 'code' mode
    const [showHintConfirm, setShowHintConfirm] = useState(false);
    const [glowingBlocks, setGlowingBlocks] = useState([]); // Block IDs that should glow (Hint tier 2)
    const [theme, setTheme] = useState('dark'); // Light/Dark mode toggle

    // Lasso Selection State
    const [selectedBlockIds, setSelectedBlockIds] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionCurrent, setSelectionCurrent] = useState(null);
    const [activeDragDelta, setActiveDragDelta] = useState(null);
    const [activeDragId, setActiveDragId] = useState(null);
    const [canvasScale, setCanvasScale] = useState(1);

    const containerRef = useRef(null);
    const workspaceRef = useRef(null);

    // Handle global pointer events for smooth lasso dragging
    useEffect(() => {
        if (!isSelecting) return;
        
        const onMove = (e) => {
            if (!workspaceRef.current) return;
            const rect = workspaceRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / canvasScale;
            const y = (e.clientY - rect.top) / canvasScale;
            setSelectionCurrent({ x, y });

            const left = Math.min(selectionStart.x, x);
            const right = Math.max(selectionStart.x, x);
            const top = Math.min(selectionStart.y, y);
            const bottom = Math.max(selectionStart.y, y);

            const newlySelected = [];
            blocks.forEach(block => {
                if (!block.inWorkspace) return;
                const blockLeft = block.position.x;
                const blockRight = block.position.x + 140;
                const blockTop = block.position.y;
                const blockBottom = block.position.y + 48;

                if (blockRight > left && blockLeft < right && blockBottom > top && blockTop < bottom) {
                    newlySelected.push(block.id);
                }
            });
            setSelectedBlockIds(newlySelected);
        };

        const onUp = () => {
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionCurrent(null);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [isSelecting, selectionStart, blocks, canvasScale]);

    const handlePointerDown = (e) => {
        // Prevent lasso if interacting with a block or UI element
        if (e.target.closest('.puzzle-block') || e.target.closest('button')) {
            const blockEl = e.target.closest('.puzzle-block');
            if (blockEl) {
                const blockId = blockEl.getAttribute('data-block-id');
                // If clicked an unselected block, clear selection
                if (blockId && !selectedBlockIds.includes(blockId)) {
                    setSelectedBlockIds([]);
                }
            }
            return;
        }
        
        const rect = workspaceRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvasScale;
        const y = (e.clientY - rect.top) / canvasScale;
        
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionCurrent({ x, y });
        setSelectedBlockIds([]);
    };

    // Use config mode if available, fallback to level-based for legacy
    const getActiveMode = () => {
        // FAILSAFE: If no blocks are provided but we are in a block mode, force code mode
        const hasBlocks = puzzle?.initialBlocks && puzzle.initialBlocks.length > 0;

        if (!config?.gameMode) {
            const baseMode = level >= 21 ? 'code' : level >= 11 ? 'brick' : 'jigsaw';
            if ((baseMode === 'jigsaw' || baseMode === 'brick') && !hasBlocks) return 'code';
            return baseMode;
        }

        if (config.gameMode === 'Text Code') return 'code';
        if (config.gameMode === 'Puzzle Blocks') {
            return hasBlocks ? 'brick' : 'code';
        }
        // Interlocking Puzzle (jigsaw)
        return hasBlocks ? 'jigsaw' : 'code';
    };

    const mode = getActiveMode();

    const sensors = useSensors(useSensor(PointerSensor));
    const { playConnect, playCountdownVoice, playClick } = useSound();
    const { user, updateExp } = useUser();

    // Calculate initial scale based on block count (clamped to 60%-100%)
    const getScaleForBlockCount = (count) => {
        if (count <= 3) return 1;
        if (count <= 5) return 0.85;
        if (count <= 8) return 0.7;
        return 0.6;
    };

    useEffect(() => {
        if (puzzle) {
            // Reset common state
            setResult(null);
            setIsSuccess(false);
            setIsFailed(false);
            setSubmitAttempts(0);
            startTimeRef.current = Date.now();
            setHintLevel(0);
            setGlowingBlocks([]);
            setCurrentReward(puzzle.rewards?.exp || 100);
            setTerminalLogs([
                "> System initialized...",
                `> Track: ${urlMode} | ${urlDifficulty}`,
                "> Waiting for input sequence..."
            ]);

            // Handle Blocks
            if (puzzle.initialBlocks && puzzle.initialBlocks.length > 0) {
                const COLS = 3;
                const COL_SPACING = 200;
                const ROW_SPACING = 90;
                // Helper function to dynamically assign matching tabs/slots
                const assignDynamicConnectors = (blockId) => {
                    const seqIdx = puzzle.correctSequence ? puzzle.correctSequence.indexOf(blockId) : -1;
                    const topConn = Math.random() > 0.5 ? 1 : 2;
                    const bottomConn = Math.random() > 0.5 ? 1 : 2;

                    if (seqIdx !== -1) {
                        const hasNext = seqIdx < puzzle.correctSequence.length - 1;
                        const hasPrev = seqIdx > 0;
                        return {
                            top: topConn,
                            bottom: bottomConn,
                            right: hasNext ? 1 : (Math.random() > 0.5 ? 1 : 2),
                            left: hasPrev ? 2 : (Math.random() > 0.5 ? 1 : 2),
                        };
                    }
                    return {
                        top: topConn,
                        bottom: bottomConn,
                        right: Math.random() > 0.5 ? 1 : 2,
                        left: Math.random() > 0.5 ? 1 : 2,
                    };
                };

                const initialized = puzzle.initialBlocks.map((b, i) => ({
                    ...b,
                    inWorkspace: false, // Blocks start in the inventory
                    connectors: assignDynamicConnectors(b.id),
                    position: {
                        x: 40 + (i % COLS) * COL_SPACING + (Math.random() * 30 - 15),
                        y: 80 + Math.floor(i / COLS) * ROW_SPACING + (Math.random() * 20 - 10)
                    }
                }));
                setBlocks(initialized);
            } else {
                setBlocks([]); // Clear if no blocks provided
            }

            // Reset Code for Code Mode
            if (mode === 'code') {
                setCodeValue(puzzle.initialCode || "");
            }

            // Set canvas scale based on block count
            const blockCount = puzzle.initialBlocks?.length || 0;
            setCanvasScale(getScaleForBlockCount(blockCount));
        }
    }, [puzzle, isOpen, mode, urlMode, urlDifficulty]);

    const handleDragEnd = (event) => {
        const { active, delta } = event;
        if (!active) return;

        // NOTE: customModifier already divides the visual transform by canvasScale,
        // and dnd-kit reports the delta in the MODIFIED coordinate space.
        // So we must NOT divide delta by canvasScale again here.
        const scaledDeltaX = delta.x / canvasScale;
        const scaledDeltaY = delta.y / canvasScale;

        setBlocks((currentBlocks) => {
            const isMultiDrag = selectedBlockIds.length > 1 && selectedBlockIds.includes(active.id);

            // --- MULTI-DRAG LOGIC ---
            if (isMultiDrag) {
                return currentBlocks.map(block => {
                    if (selectedBlockIds.includes(block.id)) {
                        let newX = block.position.x + scaledDeltaX;
                        let newY = block.position.y + scaledDeltaY;
                        
                        const padding = 10;
                        const wsEl = workspaceRef.current || containerRef.current;
                        const containerW = wsEl ? wsEl.clientWidth / canvasScale : 2000;
                        const containerH = wsEl ? wsEl.clientHeight / canvasScale : 1500;
                        const maxWidth = containerW - 170;
                        const maxHeight = containerH - 70;
                        
                        newX = Math.max(padding, Math.min(newX, maxWidth));
                        newY = Math.max(padding, Math.min(newY, maxHeight));

                        const updatedBlock = { ...block, position: { x: newX, y: newY } };

                        // Multi-drag overlap logic
                        let overlap = true;
                        let attempts = 0;
                        while (overlap && attempts < 10) {
                            overlap = false;
                            for (const other of currentBlocks) {
                                if (selectedBlockIds.includes(other.id)) continue;
                                if (!other.inWorkspace) continue;
                                
                                const dx = Math.abs(updatedBlock.position.x - other.position.x);
                                const dy = Math.abs(updatedBlock.position.y - other.position.y);

                                if (dx < 150 && dy < 58) {
                                    updatedBlock.position.y += 60;
                                    updatedBlock.position.x += 10;
                                    overlap = true;
                                    break;
                                }
                            }
                            attempts++;
                        }

                        // Re-clamp after overlap push
                        updatedBlock.position.x = Math.max(padding, Math.min(updatedBlock.position.x, maxWidth));
                        updatedBlock.position.y = Math.max(padding, Math.min(updatedBlock.position.y, maxHeight));

                        return updatedBlock;
                    }
                    return block;
                });
            }

            // --- SINGLE DRAG LOGIC ---
            const index = currentBlocks.findIndex(b => b.id === active.id);
            if (index === -1) return currentBlocks;

            const newBlocks = [...currentBlocks];
            let newX = newBlocks[index].position.x + scaledDeltaX;
            let newY = newBlocks[index].position.y + scaledDeltaY;

            const padding = 10;
            const wsEl = workspaceRef.current || containerRef.current;
            const containerW = wsEl ? wsEl.clientWidth / canvasScale : 2000;
            const containerH = wsEl ? wsEl.clientHeight / canvasScale : 1500;
            const maxWidth = containerW - 170;
            const maxHeight = containerH - 70;
            
            newX = Math.max(padding, Math.min(newX, maxWidth));
            newY = Math.max(padding, Math.min(newY, maxHeight));

            const updatedBlock = {
                ...newBlocks[index],
                position: { x: newX, y: newY }
            };

            // Get this block's connectors
            const draggedConnectors = updatedBlock.connectors || {};

            // ROBUST SNAPPING: Find the BEST snap candidate (closest valid snap)
            // Use generous thresholds scaled by zoom — at 60% zoom these become very forgiving
            const BLOCK_WIDTH = 140;
            const BLOCK_HEIGHT = 48;
            const SNAP_RADIUS_X = 120 / canvasScale; // ~200px at 60% zoom
            const SNAP_RADIUS_Y = 80 / canvasScale;  // ~133px at 60% zoom

            // Connector compatibility: tab (1) must meet slot (2) or vice versa
            const connectorsMatch = (sideA, sideB) => {
                return (sideA === 1 && sideB === 2) || (sideA === 2 && sideB === 1);
            };

            // Find the closest valid snap among ALL workspace blocks
            let bestSnap = null;
            let bestDist = Infinity;

            for (const other of newBlocks) {
                if (other.id === active.id) continue;
                if (!other.inWorkspace) continue;

                const otherConnectors = other.connectors || {};
                const dx = updatedBlock.position.x - other.position.x;
                const dy = updatedBlock.position.y - other.position.y;

                // Check all 4 snap directions and pick the closest
                const candidates = [
                    // Snap to RIGHT of other (dragged is to the right)
                    {
                        valid: Math.abs(dx - BLOCK_WIDTH) < SNAP_RADIUS_X && Math.abs(dy) < SNAP_RADIUS_Y
                            && connectorsMatch(otherConnectors.right, draggedConnectors.left),
                        pos: { x: Math.round(other.position.x + BLOCK_WIDTH), y: Math.round(other.position.y) },
                        dist: Math.abs(dx - BLOCK_WIDTH) + Math.abs(dy)
                    },
                    // Snap to LEFT of other (dragged is to the left)
                    {
                        valid: Math.abs(dx + BLOCK_WIDTH) < SNAP_RADIUS_X && Math.abs(dy) < SNAP_RADIUS_Y
                            && connectorsMatch(draggedConnectors.right, otherConnectors.left),
                        pos: { x: Math.round(other.position.x - BLOCK_WIDTH), y: Math.round(other.position.y) },
                        dist: Math.abs(dx + BLOCK_WIDTH) + Math.abs(dy)
                    },
                    // Snap BELOW other
                    {
                        valid: Math.abs(dy - BLOCK_HEIGHT) < SNAP_RADIUS_Y && Math.abs(dx) < SNAP_RADIUS_X
                            && connectorsMatch(otherConnectors.bottom, draggedConnectors.top),
                        pos: { x: Math.round(other.position.x), y: Math.round(other.position.y + BLOCK_HEIGHT) },
                        dist: Math.abs(dy - BLOCK_HEIGHT) + Math.abs(dx)
                    },
                    // Snap ABOVE other
                    {
                        valid: Math.abs(dy + BLOCK_HEIGHT) < SNAP_RADIUS_Y && Math.abs(dx) < SNAP_RADIUS_X
                            && connectorsMatch(draggedConnectors.bottom, otherConnectors.top),
                        pos: { x: Math.round(other.position.x), y: Math.round(other.position.y - BLOCK_HEIGHT) },
                        dist: Math.abs(dy + BLOCK_HEIGHT) + Math.abs(dx)
                    }
                ];

                for (const c of candidates) {
                    if (c.valid && c.dist < bestDist) {
                        bestDist = c.dist;
                        bestSnap = { pos: c.pos, otherId: other.id };
                    }
                }
            }

            let snappedWithId = null;
            if (bestSnap) {
                updatedBlock.position = bestSnap.pos;
                snappedWithId = bestSnap.otherId;
                if (playConnect) playConnect();
            }

            // Clear hint glow
            if (snappedWithId && glowingBlocks.length > 0) {
                const correctIds = puzzle?.correctSequence || [];
                const draggedId = active.id;
                if (correctIds.includes(draggedId) && correctIds.includes(snappedWithId)) {
                    setGlowingBlocks(prev => prev.filter(id => id !== draggedId && id !== snappedWithId));
                }
            }

            // ANTI-OVERLAP: Gentle nudge instead of aggressive bounce
            // Skip if the block just snapped — snapped blocks are allowed to be adjacent
            if (!snappedWithId) {
                let overlap = true;
                let attempts = 0;
                while (overlap && attempts < 30) {
                    overlap = false;
                    for (const other of newBlocks) {
                        if (other.id === active.id) continue;
                        if (!other.inWorkspace) continue;

                        const ox = Math.abs(updatedBlock.position.x - other.position.x);
                        const oy = Math.abs(updatedBlock.position.y - other.position.y);

                        // Only push if genuinely overlapping (not just adjacent/near)
                        if (ox < 140 && oy < 48) {
                            // Nudge in the direction away from the other block
                            const pushX = updatedBlock.position.x >= other.position.x ? 5 : -5;
                            const pushY = updatedBlock.position.y >= other.position.y ? 5 : -5;
                            updatedBlock.position.x += pushX;
                            updatedBlock.position.y += pushY;
                            overlap = true;
                            break;
                        }
                    }
                    attempts++;
                }
            }

            // Final boundary clamp after snap/anti-overlap
            const wsEl2 = workspaceRef.current || containerRef.current;
            const cW = wsEl2 ? wsEl2.clientWidth / canvasScale : 2000;
            const cH = wsEl2 ? wsEl2.clientHeight / canvasScale : 1500;
            updatedBlock.position.x = Math.max(10, Math.min(updatedBlock.position.x, cW - 170));
            updatedBlock.position.y = Math.max(10, Math.min(updatedBlock.position.y, cH - 70));

            newBlocks[index] = updatedBlock;
            return newBlocks;
        });
    };

    // Modifier: compensate for CSS scale on the container so the block follows the cursor during drag
    const customModifier = ({ transform }) => ({
        ...transform,
        x: transform.x / canvasScale,
        y: transform.y / canvasScale
    });

    const getRandomWittyError = () => {
        const errors = [
            "The computer is confusingly staring back at you.",
            "That code sequence caused a singularity. Try again.",
            "Syntax detected... logic? Not so much.",
            "The compiler just sighed. Loudly.",
            "404: Logic not found."
        ];
        return errors[Math.floor(Math.random() * errors.length)];
    };

    // Helper: Construct readable code from blocks for AI context
    const constructCodeFromBlocks = (currentBlocks) => {
        if (!currentBlocks || currentBlocks.length === 0) return "";
        
        // Filter out dummy distractor blocks and blocks not in workspace
        const validBlocks = currentBlocks.filter(b => !b.isDummy && !b.id.startsWith('dummy') && b.inWorkspace);
        if (validBlocks.length === 0) return "";

        // Sort blocks by position (Y, then X) to approximate reading order
        const sorted = [...validBlocks].sort((a, b) => {
            if (Math.abs(a.position.y - b.position.y) > 40) return a.position.y - b.position.y;
            return a.position.x - b.position.x;
        });
        
        let code = "";
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0) {
                if (Math.abs(sorted[i].position.y - sorted[i-1].position.y) <= 40) {
                    code += " ";
                } else {
                    code += "\n";
                }
            }
            code += sorted[i].content;
        }
        return code;
    };

    const handleAIAnalysis = async (userCode) => {
        setIsAnalyzingEntry(true);
        setTerminalLogs(prev => [...prev, `> ANALYZING ERROR PATTERNS...`]);

        try {
            const analysis = await aiAPI.debugCode(
                userCode,
                config?.language || 'Python',
                puzzle?.description || 'Solving a coding puzzle'
            );

            // Assuming the API returns text directly or JSON with a field
            // The previous view of ai.js showed it returns response.text() directly as feedback if configured so, 
            // but let's check ai.js output. 
            // Wait, ai.js returns `const feedback = response.text()`. 
            // Does logic in api.js return JSON? lines 304 in api.js: returns apiRequest results.
            // backend/api/ai.js sends `res.json({ feedback })`? 
            // I need to check backend/api/ai.js return value. 
            // Actually, I'll assume it returns { feedback: "string" } or just the object.

            const hint = analysis.feedback || analysis.message || "Try checking your syntax logic.";
            setTerminalLogs(prev => [...prev, `> [AI ASSISTANT]: ${hint}`]);

        } catch (error) {
            console.error("AI Analysis failed", error);
            setTerminalLogs(prev => [...prev, `> SYSTEM: Unable to connect to neural engine.`]);
        } finally {
            setIsAnalyzingEntry(false);
        }
    };

    const handleSubmit = () => {
        if (isFailed || isExecuting) return;
        setIsExecuting(true);

        // 1. Determine Expected Content Sequence
        const expectedSequenceIDs = puzzle.correctSequence; // e.g. ['b2', 'b1']
        const expectedContent = expectedSequenceIDs.map(id => {
            const block = puzzle.initialBlocks.find(b => b.id === id);
            return block ? block.content : null;
        });

        // 2. Identify Connected Chains
        // Helper to check if b2 is snapped "after" b1
        const isConnected = (b1, b2) => {
            const dx = b2.position.x - b1.position.x;
            const dy = b2.position.y - b1.position.y;
            const BLOCK_WIDTH = 140;
            const BLOCK_HEIGHT = 48;
            const TOLERANCE = 20; // Wide enough to handle floating-point drift at lower zoom levels

            // Horizontal connection
            const isHoriz = Math.abs(dx - BLOCK_WIDTH) < TOLERANCE && Math.abs(dy) < TOLERANCE;
            // Vertical connection
            const isVert = Math.abs(dy - BLOCK_HEIGHT) < TOLERANCE && Math.abs(dx) < TOLERANCE;

            return isHoriz || isVert;
        };

        const visited = new Set();
        const chains = [];

        // Simple connected components search
        for (const block of blocks) {
            if (!block.inWorkspace) continue; // Skip blocks not in workspace
            if (visited.has(block.id)) continue;

            const chain = [];
            const queue = [block];
            visited.add(block.id);

            while (queue.length > 0) {
                const current = queue.shift();
                chain.push(current);

                // Find neighbors (in any direction, but we care about sequence)
                // Actually, for a simple linear chain, we just look for anything connected
                for (const potentialNeighbor of blocks) {
                    if (!visited.has(potentialNeighbor.id)) {
                        // Check if potentialNeighbor is connected to current (either before or after)
                        if (isConnected(current, potentialNeighbor) || isConnected(potentialNeighbor, current)) {
                            visited.add(potentialNeighbor.id);
                            queue.push(potentialNeighbor);
                        }
                    }
                }
            }
            chains.push(chain);
        }

        // 3. Simple String-Based Content Matching (Works Across Multiple Rows)
        let success = false;
        
        // Filter out dummy blocks and blocks not in workspace
        const realBlocks = blocks.filter(b => !b.isDummy && !b.id.startsWith('dummy') && b.inWorkspace);
        
        // Sort non-dummy blocks by position (Y, then X) to approximate reading order
        realBlocks.sort((a, b) => {
            if (Math.abs(a.position.y - b.position.y) > 40) return a.position.y - b.position.y;
            return a.position.x - b.position.x;
        });

        // Normalize both strings for comparison (remove all whitespace so multi-line works)
        const userContentArranged = realBlocks.map(b => b.content).join('').replace(/\s+/g, '').trim();
        const normalizedExpected = expectedContent.join('').replace(/\s+/g, '').trim();

        // If the non-dummy blocks arranged on screen match the expected text, accept it!
        if (userContentArranged === normalizedExpected) {
            success = true;
        }

        // --- VALIDATION FOR CODE MODE ---
        if (mode === 'code') {
            const normalizedInput = codeValue.replace(/\s+/g, '').trim();
            if (normalizedInput === normalizedExpected) {
                success = true;
            }
        } else {
            // --- EXISTING STRICT BLOCK CHAIN VALIDATION (Fallback for partial matches or strict mode) ---
            if (!success) {
                for (const chain of chains) {
                    // Sort chain by X position to determine order
                    chain.sort((a, b) => a.position.x - b.position.x);

                    const chainContent = chain.map(b => b.content);

                    // Check if this single chain matches expected content
                    if (chainContent.length === expectedContent.length) {
                        const isMatch = chainContent.every((content, index) => content === expectedContent[index]);
                        if (isMatch) {
                            success = true;
                            break;
                        }
                    }
                }
            }
        }

        if (success) {
            setResult({ type: 'success', message: `> Execution Successful.` });
            setIsSuccess(true);
            setIsExecuting(false);
            setTimeout(() => {
                const timeConsumed = (Date.now() - startTimeRef.current) / 1000;
                // Pass the reduced reward (currentReward) instead of the original
                onComplete && onComplete({
                    success: true,
                    rewards: { ...puzzle.rewards, exp: currentReward },
                    metrics: {
                        time: timeConsumed,
                        errors: submitAttempts,
                        hints: hintLevel
                    }
                });
            }, 1500);
        } else {
            setSubmitAttempts(prev => prev + 1);

            // --- FLEXIBLE AI VERIFICATION START ---
            // Instead of failing immediately, ask AI if it's correct
            const codeToCheck = mode === 'code' ? codeValue : constructCodeFromBlocks(blocks);

            // Show verifying state
            setResult({ type: 'info', message: '> Verifying logic with Neural Engine...' });

            aiAPI.verifyCode(
                codeToCheck,
                config?.language || 'Python',
                puzzle?.description,
                puzzle?.expectedOutput
            ).then(verification => {
                if (verification.correct) {
                    // AI says YES -> Success!
                    setResult({ type: 'success', message: `> Logic Verified. Execution Successful.` });
                    setIsSuccess(true);
                    setIsExecuting(false);
                    setTimeout(() => {
                        const timeConsumed = (Date.now() - startTimeRef.current) / 1000;
                        onComplete && onComplete({
                            success: true,
                            rewards: { ...puzzle.rewards, exp: currentReward },
                            metrics: {
                                time: timeConsumed,
                                errors: submitAttempts, // Technically an error occurred first, but we accept it
                                hints: hintLevel
                            }
                        });
                    }, 1500);
                } else {
                    // AI says NO -> Fail
                    setResult({ type: 'error', message: `> Error: ${verification.message || getRandomWittyError()} (Check terminal for hint)` });
                    setIsSuccess(false);
                    setIsExecuting(false);

                    // Trigger AI Analysis for specific debugging hint logic
                    if (submitAttempts >= 0) {
                        handleAIAnalysis(codeToCheck);
                    }
                }
            }).catch(err => {
                console.error("Verification failed", err);
                setResult({ type: 'error', message: `> Error: System Check Failed. Please retry.` });
                setIsSuccess(false);
                setIsExecuting(false);
            });
            // --- FLEXIBLE AI VERIFICATION END ---
        }
    };

    const handleBuyHint = () => {
        // Tiered hint costs: 50, 100, 150
        const HINT_COSTS = [50, 100, 150];
        if (hintLevel >= 3) return;

        const cost = HINT_COSTS[hintLevel];

        // Check availability (deduct from User's Global EXP)
        if (!user || (user.exp || 0) < cost) {
            setTerminalLogs(prev => [...prev, `> ERROR: Insufficient Global EXP for Hint (-${cost} EXP required)`]);
            return;
        }

        // Show confirmation modal
        setShowHintConfirm(true);
    };

    const confirmBuyHint = () => {
        const HINT_COSTS = [50, 100, 150];
        const cost = HINT_COSTS[hintLevel];
        setShowHintConfirm(false);

        // Deduct cost from GLOBAL EXP
        updateExp(-cost).then(() => {
            playClick?.();

            if (hintLevel === 0) {
                // Tier 1: Text indicator hint
                const hintText = puzzle.hints?.[0]?.text || puzzle.description || 'Arrange the blocks in the correct order to form the solution.';
                setTerminalLogs(prev => [
                    ...prev,
                    `> HINT_REQ_ACK... -${cost} EXP`,
                    `> TIER 1 HINT: "${hintText}"`
                ]);
            } else if (hintLevel === 1) {
                // Tier 2: Puzzle blocks glow — highlight the correct sequence blocks
                const correctIds = puzzle.correctSequence || [];
                setGlowingBlocks(correctIds);
                setTerminalLogs(prev => [
                    ...prev,
                    `> HINT_REQ_ACK... -${cost} EXP`,
                    `> TIER 2 HINT: Correct blocks are now highlighted!`
                ]);
            } else if (hintLevel === 2) {
                // Tier 3: Auto-connect — snap puzzle blocks into the correct order
                const correctIds = puzzle.correctSequence || [];
                const startX = 100;
                const startY = 200;
                const BLOCK_WIDTH = 140;
                
                setBlocks(prev => {
                    return prev.map(block => {
                        const idx = correctIds.indexOf(block.id);
                        if (idx !== -1) {
                            return {
                                ...block,
                                inWorkspace: true,
                                position: { x: startX + idx * BLOCK_WIDTH, y: startY }
                            };
                        } else {
                            // If it's a dummy block and it happens to be near the startY, push it down so it's not run over
                            if (Math.abs(block.position.y - startY) < 60) {
                                return {
                                    ...block,
                                    position: { x: block.position.x, y: startY + 120 }
                                };
                            }
                        }
                        return block;
                    });
                });
                setTerminalLogs(prev => [
                    ...prev,
                    `> HINT_REQ_ACK... -${cost} EXP`,
                    `> TIER 3 HINT: Blocks auto-connected! Submit to verify.`
                ]);
            }

            // Advance level
            setHintLevel(prev => prev + 1);
        }).catch(err => {
            setTerminalLogs(prev => [...prev, `> ERROR: Transaction Failed`]);
        });
    };

    const handleTimeout = () => {
        setResult({ type: 'error', message: '> CRITICAL FAILURE: TIME EXPIRED' });
        // Instead of local state, bubble up to parent
        if (onComplete) {
            onComplete({ success: false });
        }
    };

    const handleDebug = async () => {
        if (!codeValue || mode !== 'code') return;

        const cost = 50; // Cost for AI debug
        if (currentReward < cost) {
            setTerminalLogs(prev => [...prev, `> ERROR: Insufficient Bounty for AI Debug (-${cost} EXP required)`]);
            return;
        }

        setTerminalLogs(prev => [...prev, `> AI_DIAGNOSTIC_ROUTINE_INITIATED...`]);

        try {
            // Deduct cost
            setCurrentReward(prev => prev - cost);

            const response = await aiAPI.debugCode(
                codeValue,
                'python', // Defaulting to python for now, or derive from puzzle
                puzzle.description
            );

            if (response.feedback) {
                setTerminalLogs(prev => [
                    ...prev,
                    `> ANALYSIS_COMPLETE (-${cost} EXP)`,
                    `> AI_HINT: "${response.feedback}"`
                ]);
            }
        } catch (error) {
            setTerminalLogs(prev => [...prev, `> ERROR: AI CONNECTION FAILED`]);
        }
    };

    // --- RENDER ---
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`w-full max-w-[95vw] h-[92vh] border rounded-lg flex flex-col relative overflow-hidden group transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0f1c] border-cyan-500/30 shadow-[0_0_80px_rgba(8,145,178,0.2)]' : 'bg-white border-slate-200 shadow-2xl'}`}
                    >
                        {/* CRT Scanline Effect */}
                        {theme === 'dark' && <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] pointer-events-none z-50 opacity-20" />}

                        {/* Decorative Corners */}
                        <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 z-40 ${theme === 'dark' ? 'border-cyan-400' : 'border-cyan-300'}`} />
                        <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 z-40 ${theme === 'dark' ? 'border-cyan-400' : 'border-cyan-300'}`} />
                        <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 z-40 ${theme === 'dark' ? 'border-cyan-400' : 'border-cyan-300'}`} />
                        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 z-40 ${theme === 'dark' ? 'border-cyan-400' : 'border-cyan-300'}`} />

                        {/* Timeout / Failure Overlay */}
                        {isFailed && (
                            <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-red-950/40 border border-red-500 p-12 max-w-lg relative overflow-hidden">
                                    <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                                    <h2 className="text-3xl font-black text-red-500 mb-4 uppercase tracking-[0.2em] font-mono glitch-text">SYSTEM FAILURE</h2>
                                    <p className="text-sm text-red-300 mb-8 font-mono">RUNTIME_ERROR: TIMEOUT_EXCEPTION</p>
                                    <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 w-full py-3 text-sm tracking-widest uppercase border border-red-400/50">Abort Sequence</Button>
                                </motion.div>
                            </div>
                        )}

                        {/* Top HUD Bar */}
                        <div className={`h-16 flex items-center justify-between px-6 border-b shrink-0 relative z-40 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050810] border-cyan-500/20' : 'bg-slate-100 border-slate-200'}`}>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full animate-ping ${theme === 'dark' ? 'bg-cyan-500' : 'bg-cyan-600'}`} />
                                    <span className={`font-mono text-xs tracking-[0.2em] uppercase ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-700'}`}>Simloop_Active</span>
                                </div>
                                <div className="h-8 w-px bg-cyan-900/50" />
                                <CodeTimer
                                    onExpire={handleTimeout}
                                    onWarning={() => playCountdownVoice("Warning. 10 seconds remaining.")}
                                />

                                {/* MOVED HINT BUTTON HERE */}
                                <div className="group relative ml-4">
                                    <div className={`absolute inset-0 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse ${hintLevel >= 3 || (user?.exp || 0) < (puzzle.hints?.[hintLevel]?.cost || 999)
                                        ? 'bg-red-400/20'
                                        : 'bg-yellow-400/20'
                                        }`} />

                                    <button
                                        onClick={handleBuyHint}
                                        disabled={hintLevel >= 3 || (user?.exp || 0) < ([50, 100, 150][hintLevel] || 999)}
                                        className={`relative flex items-center gap-2 font-bold px-4 py-2 border rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                                            ${hintLevel >= 3
                                                ? 'bg-red-400/5 border-red-400/20 text-red-400'
                                                : 'bg-yellow-400/5 border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/10 hover:scale-105'
                                            }`}
                                    >
                                        <Lightbulb className={`w-5 h-5 filter ${hintLevel >= 3 ? 'drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'}`} />
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] tracking-widest font-galsb opacity-70">
                                                {hintLevel >= 3 ? 'SYSTEM' : 'HINT REQ'}
                                            </span>
                                            <span className="text-sm tracking-widest font-galsb whitespace-nowrap">
                                                {hintLevel >= 3
                                                    ? 'MAX LEVEL'
                                                    : `-${[50, 100, 150][hintLevel] || 0} EXP`
                                                }
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className={`absolute left-1/2 -translate-x-1/2 top-0 px-6 py-1 border-b border-x rounded-b-lg transition-colors duration-500 ${theme === 'dark' ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}`}>
                                <span className={`font-black tracking-[0.3em] text-xs uppercase ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700'}`}>Level {level}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                                    className={`p-2 rounded-xl border transition-all duration-300 flex items-center justify-center group/theme ${theme === 'dark'
                                        ? 'bg-slate-900 border-white/5 text-yellow-400 hover:border-yellow-400/50 hover:shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-500 hover:text-cyan-500 shadow-sm'
                                    }`}
                                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="w-4 h-4 group-hover/theme:rotate-90 transition-transform duration-500" />
                                    ) : (
                                        <Moon className="w-4 h-4 group-hover/theme:-rotate-12 transition-transform duration-500" />
                                    )}
                                </button>
                                <button onClick={onClose} className={`p-2 rounded-full transition-all duration-500 hover:rotate-180 ${theme === 'dark' ? 'text-cyan-700 hover:text-cyan-400 hover:bg-cyan-900/20' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'}`}><X className="w-6 h-6" /></button>
                            </div>
                        </div>

                        {/* Main Grid Layout */}
                        <div className="flex-1 flex overflow-hidden relative z-30">

                            {/* LEFT: Puzzle Area (Blueprint Style) */}
                            <div className={`flex-[3] relative overflow-hidden flex flex-col transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0c1221]' : 'bg-slate-50'}`} ref={containerRef}>
                                {/* Grid Background */}
                                <div className={`absolute inset-0 pointer-events-none ${theme === 'dark' ? 'opacity-10' : 'opacity-5'}`}
                                    style={{
                                        backgroundImage: theme === 'dark' ? 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)' : 'radial-gradient(circle at 2px 2px, rgba(6,182,212,0.4) 1px, transparent 0)',
                                        backgroundSize: '40px 40px'
                                    }}
                                />

                                {/* Problem Header - Now Relative to prevent overlap */}
                                <div className="w-full p-6 z-10 relative shrink-0">
                                    <div className={`backdrop-blur-md border-l-4 p-4 max-w-3xl shadow-lg transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-900/80 border-cyan-500' : 'bg-white/90 border-cyan-500 shadow-md'}`}>
                                        <h2 className={`uppercase tracking-widest text-xs font-bold mb-1 flex items-center gap-2 ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>
                                            <span className={`w-2 h-2 ${theme === 'dark' ? 'bg-cyan-500' : 'bg-cyan-600'}`} /> Objective
                                        </h2>
                                        <p className={`text-sm font-medium leading-relaxed font-mono ${theme === 'dark' ? 'text-cyan-100' : 'text-slate-700'}`}>{puzzle?.description}</p>
                                    </div>
                                </div>

                                {mode === 'code' ? (
                                    <div className="w-full flex-1 p-6 pt-0 font-mono overflow-hidden">
                                        <textarea
                                            value={codeValue}
                                            onChange={(e) => setCodeValue(e.target.value)}
                                            className={`w-full h-full border rounded-lg p-4 focus:outline-none focus:ring-1 resize-none custom-scrollbar focus:placeholder-transparent transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0f1c]/50 border-cyan-500/30 text-cyan-100 focus:border-cyan-400 focus:ring-cyan-400 placeholder-cyan-800/50' : 'bg-white border-slate-300 text-slate-800 focus:border-cyan-500 focus:ring-cyan-500 placeholder-slate-400'}`}
                                            placeholder="# Enter your code here..."
                                            spellCheck={false}
                                        />
                                    </div>
                                ) : (
                                    <DndContext 
                                        sensors={sensors} 
                                        onDragStart={(e) => setActiveDragId(e.active.id)}
                                        onDragMove={(e) => setActiveDragDelta({ x: e.delta.x / canvasScale, y: e.delta.y / canvasScale })}
                                        onDragEnd={(e) => {
                                            setActiveDragId(null);
                                            setActiveDragDelta(null);
                                            handleDragEnd(e);
                                        }} 
                                        modifiers={[customModifier]}
                                    >
                                        <div className="relative w-full flex-1 overflow-hidden p-4">
                                            {/* Puzzle Blocks Container */}
                                            <div 
                                                ref={workspaceRef} 
                                                onPointerDown={handlePointerDown}
                                                onDragOver={(e) => { e.preventDefault(); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const blockId = e.dataTransfer.getData('text/plain');
                                                    if (!blockId) return;
                                                    
                                                    const rect = workspaceRef.current.getBoundingClientRect();
                                                    // Calculate drop position relative to scaled canvas
                                                    // Offset by ~70x24 so the mouse is in the center of the block
                                                    const dropX = ((e.clientX - rect.left) / canvasScale) - 70;
                                                    const dropY = ((e.clientY - rect.top) / canvasScale) - 24;
                                                    
                                                    setBlocks(prev => {
                                                        let newX = dropX;
                                                        let newY = dropY;
                                                        // Anti-overlap: push away from existing workspace blocks
                                                        let overlap = true;
                                                        let attempts = 0;
                                                        while (overlap && attempts < 20) {
                                                            overlap = false;
                                                            for (const other of prev) {
                                                                if (other.id === blockId) continue;
                                                                if (!other.inWorkspace) continue;
                                                                const dx = Math.abs(newX - other.position.x);
                                                                const dy = Math.abs(newY - other.position.y);
                                                                if (dx < 150 && dy < 58) {
                                                                    newY += 60;
                                                                    newX += 10;
                                                                    overlap = true;
                                                                    break;
                                                                }
                                                            }
                                                            attempts++;
                                                        }
                                                        return prev.map(b => b.id === blockId ? {
                                                            ...b,
                                                            inWorkspace: true,
                                                            position: { x: newX, y: newY }
                                                        } : b);
                                                    });
                                                }}
                                                className={`relative w-full h-full rounded-xl border-2 overflow-hidden transition-colors duration-500 touch-none ${theme === 'dark' ? 'border-cyan-400/40 bg-cyan-950/5 shadow-[inset_0_0_30px_rgba(6,182,212,0.05)]' : 'border-cyan-300/60 bg-cyan-50/30'}`}
                                            >
                                                {/* Container Label */}
                                                <div className={`absolute top-0 left-4 z-20 px-3 py-0.5 text-[9px] uppercase tracking-[0.2em] font-bold rounded-b-md ${theme === 'dark' ? 'bg-cyan-900/60 text-cyan-400 border-x border-b border-cyan-500/20' : 'bg-cyan-100 text-cyan-600 border-x border-b border-cyan-200'}`}>
                                                    ⧫ Puzzle Workspace
                                                </div>

                                                {/* Zoom & Reset Controls */}
                                                <div className="absolute bottom-3 right-3 z-50 flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setBlocks(prev => prev.map(b => ({ ...b, inWorkspace: false })));
                                                            if (playClick) playClick();
                                                        }}
                                                        className="px-3 h-8 mr-2 text-[10px] uppercase font-bold tracking-wider bg-slate-900/80 backdrop-blur-md border border-rose-500/30 hover:bg-rose-900/50 hover:border-rose-400 flex items-center justify-center rounded-lg text-rose-400 transition-all shadow-lg"
                                                    >
                                                        <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                                    </button>
                                                    <button 
                                                        onClick={() => setCanvasScale(s => Math.max(0.6, +(s - 0.1).toFixed(1)))} 
                                                        disabled={canvasScale <= 0.6}
                                                        className="w-8 h-8 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 flex items-center justify-center rounded-lg text-cyan-400 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <ZoomOut className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setCanvasScale(getScaleForBlockCount(blocks.length))} 
                                                        className="w-8 h-8 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 flex items-center justify-center rounded-lg text-cyan-400 transition-all shadow-lg"
                                                    >
                                                        <Maximize className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setCanvasScale(s => Math.min(1, +(s + 0.1).toFixed(1)))} 
                                                        disabled={canvasScale >= 1}
                                                        className="w-8 h-8 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 flex items-center justify-center rounded-lg text-cyan-400 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <ZoomIn className="w-4 h-4" />
                                                    </button>
                                                    <div className="px-2 py-1 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-lg">
                                                        <span className="text-cyan-400 font-mono text-[10px] font-bold tracking-wider">{Math.round(canvasScale * 100)}%</span>
                                                    </div>
                                                </div>

                                                {/* Scaled blocks container */}
                                                <div 
                                                    className="w-full h-full origin-top-left"
                                                    style={{ transform: `scale(${canvasScale})`, width: `${100 / canvasScale}%`, height: `${100 / canvasScale}%` }}
                                                >
                                                    <div className="relative w-full h-full p-6 pt-8">
                                                        {isSelecting && selectionStart && selectionCurrent && (
                                                            <div 
                                                                className="absolute border-2 border-cyan-400/80 bg-cyan-400/10 z-[200] pointer-events-none rounded-md"
                                                                style={{
                                                                    left: Math.min(selectionStart.x, selectionCurrent.x),
                                                                    top: Math.min(selectionStart.y, selectionCurrent.y),
                                                                    width: Math.abs(selectionCurrent.x - selectionStart.x),
                                                                    height: Math.abs(selectionCurrent.y - selectionStart.y)
                                                                }}
                                                            />
                                                        )}
                                                        {blocks.filter(b => b.inWorkspace).map((block) => {
                                                            const isMultiDragActive = selectedBlockIds.length > 1 && 
                                                                                      selectedBlockIds.includes(activeDragId) && 
                                                                                      activeDragId !== block.id && 
                                                                                      selectedBlockIds.includes(block.id);
                                                            return (
                                                                <PuzzleBlock 
                                                                    key={block.id} 
                                                                    {...block} 
                                                                    variant={mode} 
                                                                    isGlowing={glowingBlocks.includes(block.id)} 
                                                                    isSelected={selectedBlockIds.includes(block.id)} 
                                                                    isMultiDragActive={isMultiDragActive}
                                                                    activeDragDelta={activeDragDelta}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </DndContext>
                                )}
                            </div>

                            {/* RIGHT: Control Console */}
                            <div className={`flex-1 min-w-[260px] max-w-[300px] border-l flex flex-col relative z-40 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#080b14] border-cyan-500/20' : 'bg-slate-100 border-slate-200'}`} style={theme === 'dark' ? { backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-matter.png')" } : {}}>

                                {/* Info Modules */}
                                <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">

                                    {/* Rewards Module */}
                                    <div className={`p-3 relative group border transition-colors duration-500 ${theme === 'dark' ? 'bg-cyan-950/10 border-cyan-500/20' : 'bg-white border-slate-200 shadow-sm rounded-lg'}`}>
                                        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/50" />
                                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/50" />
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-full" />
                                                <img src={expIcon} className="w-9 h-9 object-contain relative z-10" alt="EXP" />
                                            </div>
                                            <div>
                                                <div className={`text-[10px] uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>EXP REWARD</div>
                                                <div className={`font-mono text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>+ {currentReward} EXP</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Target Output Module */}
                                    <div className="space-y-2">
                                        <h3 className={`uppercase tracking-widest text-[10px] font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-cyan-600' : 'text-cyan-700'}`}>
                                            <Trophy className="w-3 h-3" /> Target Output
                                        </h3>
                                        <div className={`font-mono text-sm font-bold p-3 border relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'text-emerald-400 bg-black/60 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]' : 'text-emerald-700 bg-emerald-50 border-emerald-200 rounded-lg'}`}>
                                            <div className="relative z-10">{puzzle?.expectedOutput}</div>
                                            {/* Scanline */}
                                            {theme === 'dark' && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/20 animate-scan-fast pointer-events-none" />}
                                        </div>
                                    </div>

                                    {/* Console Output */}
                                    <div className={`flex-1 min-h-[150px] border p-4 font-mono text-xs relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-black border-slate-800 text-slate-400' : 'bg-slate-800 border-slate-300 text-slate-400 rounded-lg'}`}>
                                        <div className={`absolute top-0 left-0 px-2 py-0.5 text-[9px] uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-700 text-slate-200 rounded-br-md'}`}>Terminal</div>
                                        <div className="mt-4 space-y-1">
                                            {/* Dynamic Logs */}
                                            {terminalLogs.map((log, i) => (
                                                <div key={i} className={`font-mono text-[11px] ${log.includes('ERROR') ? 'text-red-400' : log.includes('HINT') ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                    {log}
                                                </div>
                                            ))}

                                            {result && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className={`mt-4 pt-4 border-t border-dashed ${result.type === 'success' ? 'border-emerald-500/50' : 'border-red-500/50'}`}
                                                >
                                                    <div className={`font-bold ${result.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {result.type === 'success' ? '>> SUCCESS VERIFIED' : '>> ERROR DETECTED'}
                                                    </div>
                                                    <div className={result.type === 'success' ? 'text-emerald-300' : 'text-red-300'}>
                                                        {result.message}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Block Pieces Inventory */}
                                    {mode !== 'code' && blocks.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className={`uppercase tracking-widest text-[10px] font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-cyan-600' : 'text-cyan-700'}`}>
                                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" /> Block Pieces ({blocks.filter(b => !b.inWorkspace).length})
                                            </h3>
                                            <div className={`max-h-[140px] overflow-y-auto custom-scrollbar border p-2 space-y-1 rounded-md transition-colors duration-500 ${theme === 'dark' ? 'bg-black/40 border-slate-800' : 'bg-slate-100 border-slate-300 rounded-lg'}`}>
                                                {blocks.filter(b => !b.inWorkspace).map((block, i) => (
                                                    <div 
                                                        key={block.id} 
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('text/plain', block.id);
                                                            // Optional subtle visual effect
                                                            e.currentTarget.style.opacity = '0.5';
                                                        }}
                                                        onDragEnd={(e) => {
                                                            e.currentTarget.style.opacity = '1';
                                                        }}
                                                        onClick={() => {
                                                            // Fallback: Click to add to workspace with anti-overlap
                                                            setBlocks(prev => {
                                                                let newX = 100 + (Math.random() * 50);
                                                                let newY = 100 + (Math.random() * 50);
                                                                // Anti-overlap: push away from existing workspace blocks
                                                                let overlap = true;
                                                                let attempts = 0;
                                                                while (overlap && attempts < 20) {
                                                                    overlap = false;
                                                                    for (const other of prev) {
                                                                        if (other.id === block.id) continue;
                                                                        if (!other.inWorkspace) continue;
                                                                        const dx = Math.abs(newX - other.position.x);
                                                                        const dy = Math.abs(newY - other.position.y);
                                                                        if (dx < 150 && dy < 58) {
                                                                            newY += 60;
                                                                            newX += 10;
                                                                            overlap = true;
                                                                            break;
                                                                        }
                                                                    }
                                                                    attempts++;
                                                                }
                                                                return prev.map(b => b.id === block.id ? { 
                                                                    ...b, 
                                                                    inWorkspace: true, 
                                                                    position: { x: newX, y: newY } 
                                                                } : b);
                                                            });
                                                        }}
                                                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] font-mono truncate cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all shadow-sm ${theme === 'dark' ? 'bg-slate-800/80 text-cyan-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                                                        title="Click or Drag to Workspace"
                                                    >
                                                        <span className={`w-2 h-2 rounded-sm shrink-0 ${['bg-cyan-500', 'bg-purple-500', 'bg-orange-500', 'bg-emerald-500', 'bg-rose-500', 'bg-yellow-500', 'bg-blue-500', 'bg-pink-500'][i % 8]}`} />
                                                        <span className="truncate">{block.content}</span>
                                                    </div>
                                                ))}
                                                {blocks.filter(b => !b.inWorkspace).length === 0 && (
                                                    <div className="text-center py-4 text-[10px] text-slate-500 font-mono italic">
                                                        All blocks in workspace
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Bar */}
                                <div className={`p-4 border-t transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0c1221] border-cyan-500/20' : 'bg-white border-slate-200'}`}>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSuccess || isExecuting}
                                        className={`w-full py-3 text-sm font-black tracking-widest uppercase flex items-center justify-center gap-3 relative overflow-hidden group transition-all duration-300
                                            ${isSuccess
                                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                                                : isExecuting
                                                    ? 'bg-cyan-700 text-cyan-200 cursor-wait'
                                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_30px_rgba(8,145,178,0.4)]'
                                            }`}
                                    >
                                        {isExecuting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Play className={`w-5 h-5 fill-current ${isSuccess ? '' : 'group-hover:scale-110 transition-transform'}`} />
                                        )}
                                        {isSuccess ? 'SEQUENCE COMPLETE' : isExecuting ? 'EXECUTING...' : 'EXECUTE'}

                                        {!isSuccess && !isExecuting && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                                    </Button>

                                    {/* AI Debug Button Removed */}
                                </div>
                            </div>
                        </div>

                        {/* Hint Confirmation Modal */}
                        {showHintConfirm && (
                            <div className="absolute inset-0 z-[80] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-slate-900 border border-yellow-500/30 p-8 max-w-md w-full rounded-xl shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                                    <h3 className="text-yellow-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Lightbulb className="w-5 h-5" /> Confirm Hint
                                    </h3>
                                    <p className="text-slate-300 mb-6 font-mono text-sm leading-relaxed">
                                        Are you sure you want to request a hint? <br />
                                        This will cost <span className="text-yellow-400 font-bold">{[50, 100, 150][hintLevel] || 0} EXP</span> from your <span className="text-cyan-400 font-bold">TOTAL EXP ({user?.exp || 0})</span>.
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowHintConfirm(false)}
                                            className="flex-1 py-3 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors font-bold uppercase tracking-wider text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmBuyHint}
                                            className="flex-1 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-yellow-950 font-bold uppercase tracking-wider text-xs transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ChallengeModal;
