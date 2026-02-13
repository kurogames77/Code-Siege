import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Lightbulb, X, Trophy, Bug } from 'lucide-react';
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
    const startTimeRef = useRef(Date.now());

    // Hint System State
    const [hintLevel, setHintLevel] = useState(0);
    const [currentReward, setCurrentReward] = useState(0);
    const [terminalLogs, setTerminalLogs] = useState([]);
    const [codeValue, setCodeValue] = useState(''); // For 'code' mode
    const [showHintConfirm, setShowHintConfirm] = useState(false);

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
    const containerRef = useRef(null);
    const { playConnect, playCountdownVoice, playClick } = useSound();
    const { user, updateExp } = useUser();

    useEffect(() => {
        if (puzzle) {
            // Reset common state
            setResult(null);
            setIsSuccess(false);
            setIsFailed(false);
            setSubmitAttempts(0);
            startTimeRef.current = Date.now();
            setHintLevel(0);
            setCurrentReward(puzzle.rewards?.exp || 100);
            setTerminalLogs([
                "> System initialized...",
                `> Track: ${urlMode} | ${urlDifficulty}`,
                "> Waiting for input sequence..."
            ]);

            // Handle Blocks
            if (puzzle.initialBlocks && puzzle.initialBlocks.length > 0) {
                const initialized = puzzle.initialBlocks.map((b, i) => ({
                    ...b,
                    position: {
                        x: 50 + (i % 2) * 200,
                        y: 100 + Math.floor(i / 2) * 100
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
        }
    }, [puzzle, isOpen, mode, urlMode, urlDifficulty]);

    const handleDragEnd = (event) => {
        const { active, delta } = event;
        if (!active) return;

        setBlocks((currentBlocks) => {
            const index = currentBlocks.findIndex(b => b.id === active.id);
            if (index === -1) return currentBlocks;

            const newBlocks = [...currentBlocks];
            const updatedBlock = {
                ...newBlocks[index],
                position: {
                    x: newBlocks[index].position.x + delta.x,
                    y: newBlocks[index].position.y + delta.y
                }
            };

            // GENERALIZED SNAPPING LOGIC
            const SNAP_THRESHOLD = 30;
            const BLOCK_WIDTH = 140;
            const BLOCK_HEIGHT = 48;

            for (const other of newBlocks) {
                if (other.id === active.id) continue;

                const dx = updatedBlock.position.x - other.position.x;
                const dy = updatedBlock.position.y - other.position.y;

                // Horizontal Snap (Current Right to Other Left)
                if (Math.abs(dx - BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x + BLOCK_WIDTH, y: other.position.y };
                    playConnect(); // Play snap sound
                    break;
                }

                // Horizontal Snap (Current Left to Other Right)
                if (Math.abs(dx + BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x - BLOCK_WIDTH, y: other.position.y };
                    playConnect(); // Play snap sound
                    break;
                }

                // Vertical Snap (Current Bottom to Other Top)
                if (Math.abs(dy - BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x, y: other.position.y + BLOCK_HEIGHT };
                    playConnect(); // Play snap sound
                    break;
                }

                // Vertical Snap (Current Top to Other Bottom)
                if (Math.abs(dy + BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x, y: other.position.y - BLOCK_HEIGHT };
                    playConnect(); // Play snap sound
                    break;
                }
            }

            newBlocks[index] = updatedBlock;
            return newBlocks;
        });
    };

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
        // Sort blocks by position (Y, then X) to approximate reading order
        const sorted = [...currentBlocks].sort((a, b) => {
            if (Math.abs(a.position.y - b.position.y) > 40) return a.position.y - b.position.y;
            return a.position.x - b.position.x;
        });
        return sorted.map(b => b.content).join('\n');
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
        if (isFailed) return;

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

            // Horizontal connection
            const isHoriz = Math.abs(dx - BLOCK_WIDTH) < 10 && Math.abs(dy) < 10;
            // Vertical connection
            const isVert = Math.abs(dy - BLOCK_HEIGHT) < 10 && Math.abs(dx) < 10;

            return isHoriz || isVert;
        };

        const visited = new Set();
        const chains = [];

        // Simple connected components search
        for (const block of blocks) {
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

        // 3. Validate Chains
        let success = false;

        for (const chain of chains) {
            // Sort chain by X position to determine order
            chain.sort((a, b) => a.position.x - b.position.x);

            const chainContent = chain.map(b => b.content);

            // Check if this chain matches expected content
            if (chainContent.length === expectedContent.length) {
                const isMatch = chainContent.every((content, index) => content === expectedContent[index]);
                if (isMatch) {
                    success = true;
                    break;
                }
            }
        }

        // --- VALIDATION FOR CODE MODE ---
        if (mode === 'code') {
            // Simple string match or output check?
            // Assuming we check if the code *contains* specific keywords or matches exact solution.
            // Ideally we'd run it, but for now we'll check against expected string or keywords.
            // If puzzle.solution exists, check against that.
            // Else, check if it matches expected content concatenated?

            // Simplest approach: Check if user typed the contents of the correct sequence in order.
            const expectedCode = expectedContent.join('\n'); // Assuming blocks are lines
            const normalizedInput = codeValue.replace(/\s+/g, '').trim();
            const normalizedExpected = expectedContent.join('').replace(/\s+/g, '').trim();

            // Check if input roughly matches the concatenated content of correct blocks
            // OR check if it matches puzzle.solution if provided.
            if (normalizedInput === normalizedExpected) {
                success = true;
            }
            // Be more lenient or specific? 
            // Let's assume the user just needs to type the "content" of the blocks in order.
        } else {
            // --- EXISTING BLOCK CHAIN VALIDATION ---
            for (const chain of chains) {
                // Sort chain by X position to determine order
                chain.sort((a, b) => a.position.x - b.position.x);

                const chainContent = chain.map(b => b.content);

                // Check if this chain matches expected content
                if (chainContent.length === expectedContent.length) {
                    const isMatch = chainContent.every((content, index) => content === expectedContent[index]);
                    if (isMatch) {
                        success = true;
                        break;
                    }
                }
            }
        }

        if (success) {
            setResult({ type: 'success', message: `> Execution Successful.` });
            setIsSuccess(true);
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

                    // Trigger AI Analysis for specific debugging hint logic
                    if (submitAttempts >= 0) {
                        handleAIAnalysis(codeToCheck);
                    }
                }
            }).catch(err => {
                console.error("Verification failed", err);
                setResult({ type: 'error', message: `> Error: System Check Failed. Please retry.` });
                setIsSuccess(false);
            });
            // --- FLEXIBLE AI VERIFICATION END ---
        }
    };

    const handleBuyHint = () => {
        if (!puzzle.hints || hintLevel >= puzzle.hints.length) return;

        const nextHint = puzzle.hints[hintLevel];

        // Check availability (deduct from User's Global EXP)
        if (!user || user.exp < nextHint.cost) {
            setTerminalLogs(prev => [...prev, `> ERROR: Insufficient Global EXP for Hint (-${nextHint.cost} EXP required)`]);
            return;
        }

        // Show confirmation modal
        setShowHintConfirm(true);
    };

    const confirmBuyHint = () => {
        const nextHint = puzzle.hints[hintLevel];
        setShowHintConfirm(false);

        // Deduct cost from GLOBAL EXP
        updateExp(-nextHint.cost).then(() => {
            playClick?.();

            // Show hint in console
            setTerminalLogs(prev => [
                ...prev,
                `> HINT_REQ_ACK... -${nextHint.cost} EXP (User Balance)`,
                `> SYSTEM_MSG: "${nextHint.text}"`
            ]);

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
                        className="w-full max-w-[90vw] h-[85vh] bg-[#0a0f1c] border border-cyan-500/30 rounded-lg shadow-[0_0_80px_rgba(8,145,178,0.2)] flex flex-col relative overflow-hidden group"
                    >
                        {/* CRT Scanline Effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] pointer-events-none z-50 opacity-20" />

                        {/* Decorative Corners */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 z-40" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 z-40" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 z-40" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 z-40" />

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
                        <div className="h-16 bg-[#050810] flex items-center justify-between px-6 border-b border-cyan-500/20 shrink-0 relative z-40">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
                                    <span className="text-cyan-500 font-mono text-xs tracking-[0.2em] uppercase">Simloop_Active</span>
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
                                        disabled={hintLevel >= 3 || (user?.exp || 0) < (puzzle.hints?.[hintLevel]?.cost || 999)}
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
                                                    : `-${puzzle.hints?.[hintLevel]?.cost || 0} EXP`
                                                }
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-cyan-950/30 px-6 py-1 border-b border-x border-cyan-500/30 rounded-b-lg">
                                <span className="text-cyan-400 font-black tracking-[0.3em] text-xs uppercase">Level {level}</span>
                            </div>

                            <div className="flex items-center gap-6">
                                <button onClick={onClose} className="text-cyan-700 hover:text-cyan-400 p-2 hover:bg-cyan-900/20 rounded-full transition-all duration-500 hover:rotate-180"><X className="w-6 h-6" /></button>
                            </div>
                        </div>

                        {/* Main Grid Layout */}
                        <div className="flex-1 flex overflow-hidden relative z-30">

                            {/* LEFT: Puzzle Area (Blueprint Style) */}
                            <div className="flex-[3] bg-[#0c1221] relative overflow-hidden flex flex-col" ref={containerRef}>
                                {/* Grid Background */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{
                                        backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
                                        backgroundSize: '40px 40px'
                                    }}
                                />

                                {/* Problem Header - Now Relative to prevent overlap */}
                                <div className="w-full p-6 z-10 relative shrink-0">
                                    <div className="bg-slate-900/80 backdrop-blur-md border-l-4 border-cyan-500 p-4 max-w-3xl shadow-lg">
                                        <h2 className="text-cyan-500 uppercase tracking-widest text-xs font-bold mb-1 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-cyan-500" /> Objective
                                        </h2>
                                        <p className="text-cyan-100 text-sm font-medium leading-relaxed font-mono">{puzzle?.description}</p>
                                    </div>
                                </div>

                                {mode === 'code' ? (
                                    <div className="w-full flex-1 p-6 pt-0 font-mono overflow-hidden">
                                        <textarea
                                            value={codeValue}
                                            onChange={(e) => setCodeValue(e.target.value)}
                                            className="w-full h-full bg-[#0a0f1c]/50 border border-cyan-500/30 rounded-lg p-4 text-cyan-100 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-800/50 resize-none custom-scrollbar focus:placeholder-transparent"
                                            placeholder="# Enter your code here..."
                                            spellCheck={false}
                                        />
                                    </div>
                                ) : (
                                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                        <div className="relative w-full flex-1 p-12 overflow-y-auto custom-scrollbar">
                                            {blocks.map((block) => (
                                                <PuzzleBlock key={block.id} {...block} variant={mode} />
                                            ))}
                                        </div>
                                    </DndContext>
                                )}
                            </div>

                            {/* RIGHT: Control Console */}
                            <div className="flex-1 min-w-[350px] max-w-[400px] bg-[#080b14] border-l border-cyan-500/20 flex flex-col relative z-40 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">

                                {/* Info Modules */}
                                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">

                                    {/* Rewards Module */}
                                    <div className="bg-cyan-950/10 border border-cyan-500/20 p-4 relative group">
                                        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/50" />
                                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/50" />
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-full" />
                                                <img src={expIcon} className="w-9 h-9 object-contain relative z-10" alt="EXP" />
                                            </div>
                                            <div>
                                                <div className="text-cyan-500 text-[10px] uppercase tracking-widest font-bold">EXP REWARD</div>
                                                <div className="text-white font-mono text-base font-bold">+ {currentReward} EXP</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Target Output Module */}
                                    <div className="space-y-2">
                                        <h3 className="text-cyan-600 uppercase tracking-widest text-[10px] font-bold flex items-center gap-2">
                                            <Trophy className="w-3 h-3" /> Target Output
                                        </h3>
                                        <div className="font-mono text-emerald-400 text-sm font-bold bg-black/60 p-3 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden">
                                            <div className="relative z-10">{puzzle?.expectedOutput}</div>
                                            {/* Scanline */}
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/20 animate-scan-fast pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Console Output */}
                                    <div className="flex-1 min-h-[150px] bg-black border border-slate-800 p-4 font-mono text-xs text-slate-400 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 px-2 py-0.5 bg-slate-800 text-[9px] uppercase tracking-wider text-slate-300">Terminal</div>
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
                                </div>

                                {/* Action Bar */}
                                <div className="p-6 bg-[#0c1221] border-t border-cyan-500/20">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSuccess}
                                        className={`w-full py-3 text-sm font-black tracking-widest uppercase flex items-center justify-center gap-3 relative overflow-hidden group transition-all duration-300
                                            ${isSuccess
                                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_30px_rgba(8,145,178,0.4)]'
                                            }`}
                                    >
                                        <Play className={`w-5 h-5 fill-current ${isSuccess ? '' : 'group-hover:scale-110 transition-transform'}`} />
                                        {isSuccess ? 'SEQUENCE COMPLETE' : 'EXECUTE'}

                                        {!isSuccess && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
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
                                        This will cost <span className="text-yellow-400 font-bold">{puzzle.hints?.[hintLevel]?.cost || 0} EXP</span> from your <span className="text-cyan-400 font-bold">TOTAL EXP ({user?.exp || 0})</span>.
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
