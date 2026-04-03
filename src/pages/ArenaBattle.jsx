
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Trophy, ZoomIn, ZoomOut, Maximize, Loader2 } from 'lucide-react';
import PuzzleBlock from '../components/game/PuzzleBlock';
import CodeTimer from '../components/game/CodeTimer';
import Button from '../components/ui/Button';
import useSound from '../hooks/useSound';

// Assets
import expIcon from '../assets/exp.png';
import postSceneVideo from '../assets/postsceneview.mp4';

// Components
import BattleScene from '../components/game/BattleScene';
import VictoryModal from '../components/game/VictoryModal';
import DefeatModal from '../components/game/DefeatModal';

import { useUser } from '../contexts/UserContext';
import { getRankFromExp as getRankData } from '../utils/rankSystem';
import { coursesAPI } from '../services/api';
import supabase from '../lib/supabase';

const ArenaBattle = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { opponent = 'Unknown Recruiter', opponentAvatar, opponentRankName, opponentRankIcon, language = 'JavaScript', wager = '100', mode: lobbyMode = 'Puzzle Blocks', difficulty, lobbyId } = location.state || {};

    // Mimic ChallengeModal State
    const [blocks, setBlocks] = useState([]);
    const [result, setResult] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isFailed, setIsFailed] = useState(false);

    // Hints Removed - Logic Simplified
    const [currentReward, setCurrentReward] = useState(parseInt(wager, 10) || 100);
    const [terminalLogs, setTerminalLogs] = useState([]);

    const [codeValue, setCodeValue] = useState(''); // Textarea content for Hardcode mode
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const { user, updateExp } = useUser();

    // Battle Scene States
    const [showPostScene, setShowPostScene] = useState(false);
    const [showBattle, setShowBattle] = useState(false);
    const [battleOutcome, setBattleOutcome] = useState('win'); // 'win' | 'loss'
    const [showVictory, setShowVictory] = useState(false);
    const [showDefeat, setShowDefeat] = useState(false);
    const videoRef = useRef(null);
    const arenaChannelRef = useRef(null);
    const [opponentWithdrew, setOpponentWithdrew] = useState(false);

    // Level/Mode - use lobby selection
    const level = 1;
    // Map lobby mode names to PuzzleBlock variant
    const getActiveMode = () => {
        if (lobbyMode === 'Hardcode') return 'code';
        if (lobbyMode === 'Blocks') return 'brick';
        if (lobbyMode === 'Puzzle Blocks') return 'jigsaw';
        return 'jigsaw'; // default to jigsaw
    };
    const mode = getActiveMode();

    const sensors = useSensors(useSensor(PointerSensor));
    const containerRef = useRef(null);
    const { playConnect, playCountdownVoice, playClick } = useSound();

    // Calculate initial scale based on block count
    const getScaleForBlockCount = (count) => {
        if (count <= 3) return 1;
        if (count <= 5) return 0.85;
        if (count <= 8) return 0.7;
        return 0.6;
    };
    const [canvasScale, setCanvasScale] = useState(1);

    const customModifier = ({ transform }) => ({
        ...transform,
        x: transform.x / canvasScale,
        y: transform.y / canvasScale
    });

    // Dynamic puzzle state (fetched from Supabase)
    const [puzzle, setPuzzle] = useState(null);
    const [loadingPuzzle, setLoadingPuzzle] = useState(true);

    // Map lobby mode names to database course_mode values
    const getDbCourseMode = (lobbyModeName) => {
        if (lobbyModeName === 'Puzzle Blocks') return 'Beginner';
        if (lobbyModeName === 'Blocks') return 'Intermediate';
        if (lobbyModeName === 'Hardcode') return 'Advance';
        return 'Beginner';
    };

    // Fallback puzzle if Supabase fetch fails or returns no data
    const fallbackPuzzle = {
        description: mode === 'code'
            ? "Write the code to produce the expected output below."
            : "Arrange the blocks to calculate the total power output.",
        expectedOutput: "Total Power: 500",
        initialBlocks: [
            { id: 'b1', content: 'var power = 100;', type: 'variable' },
            { id: 'b2', content: 'var multiplier = 5;', type: 'variable' },
            { id: 'b3', content: 'console.log("Total Power: " + (power * multiplier));', type: 'print' }
        ],
        correctSequence: ['b1', 'b2', 'b3'],
        rewards: { exp: parseInt(wager, 10) || 100 }
    };

    // Fetch a random level from Supabase matching lobby settings
    useEffect(() => {
        const fetchDuelPuzzle = async () => {
            setLoadingPuzzle(true);
            try {
                // 1. Get all courses to find the matching language/course
                const courses = await coursesAPI.getCourses();
                const matchedCourse = courses.find(c =>
                    c.name.toLowerCase().includes(language.toLowerCase().replace(' (rec.)', ''))
                );

                if (matchedCourse) {
                    const dbMode = getDbCourseMode(lobbyMode);
                    const dbDifficulty = difficulty || 'Easy';

                    // 2. Fetch levels matching mode + difficulty for this course
                    const levels = await coursesAPI.getLevels(
                        matchedCourse.id,
                        dbMode,
                        dbDifficulty
                    );

                    if (levels && levels.length > 0) {
                        // 3. Pick a consistent level based on lobbyId
                        // Create a deterministic hash from lobbyId so both players get the same puzzle
                        const seedStr = String(lobbyId || location.state?.battleRecordId || 'fallback-seed-123');
                        let hash = 0;
                        for (let i = 0; i < seedStr.length; i++) {
                            hash = (hash << 5) - hash + seedStr.charCodeAt(i);
                            hash |= 0; // Convert to 32bit integer
                        }
                        const seed = Math.abs(hash);
                        const randomLevel = levels[seed % levels.length];

                        const puzzleData = {
                            description: randomLevel.description || (mode === 'code'
                                ? "Write the code to produce the expected output below."
                                : "Arrange the blocks to produce the expected output."),
                            expectedOutput: randomLevel.expectedOutput || randomLevel.expected_output || 'N/A',
                            initialBlocks: randomLevel.initialBlocks || randomLevel.initial_blocks || [],
                            correctSequence: randomLevel.correctSequence || randomLevel.correct_sequence || [],
                            initialCode: randomLevel.initialCode || randomLevel.initial_code || '',
                            rewards: randomLevel.rewards || { exp: parseInt(wager, 10) || 100 }
                        };

                        // Parse JSON strings if needed
                        if (typeof puzzleData.initialBlocks === 'string') {
                            puzzleData.initialBlocks = JSON.parse(puzzleData.initialBlocks);
                        }
                        if (typeof puzzleData.correctSequence === 'string') {
                            puzzleData.correctSequence = JSON.parse(puzzleData.correctSequence);
                        }
                        if (typeof puzzleData.rewards === 'string') {
                            puzzleData.rewards = JSON.parse(puzzleData.rewards);
                        }

                        // Override rewards to use wager
                        puzzleData.rewards = { exp: parseInt(wager, 10) || 100 };

                        console.log(`[ArenaBattle] Loaded level: ${randomLevel.title || 'Untitled'} | Mode: ${dbMode} | Difficulty: ${dbDifficulty}`);
                        setPuzzle(puzzleData);
                    } else {
                        console.warn('[ArenaBattle] No levels found for settings, using fallback.');
                        setPuzzle(fallbackPuzzle);
                    }
                } else {
                    console.warn(`[ArenaBattle] No course matched for language: ${language}`);
                    setPuzzle(fallbackPuzzle);
                }
            } catch (err) {
                console.error('[ArenaBattle] Failed to fetch puzzle from DB:', err);
                setPuzzle(fallbackPuzzle);
            } finally {
                setLoadingPuzzle(false);
            }
        };

        fetchDuelPuzzle();
    }, [language, lobbyMode, difficulty]);

    // Initialize blocks when puzzle changes
    useEffect(() => {
        if (puzzle && puzzle.initialBlocks) {
            setCanvasScale(getScaleForBlockCount(puzzle.initialBlocks.length));
            const initialized = puzzle.initialBlocks.map((b, i) => ({
                ...b,
                position: {
                    x: 50 + (i % 2) * 200,
                    y: 100 + Math.floor(i / 2) * 100
                }
            }));
            setBlocks(initialized);
            setResult(null);
            setIsSuccess(false);
            setIsFailed(false);
            setCurrentReward(puzzle.rewards?.exp || 0);

            // Ensure code editor starts fresh without giving away the solution
            if (mode === 'code') {
                setCodeValue('');
            }

            setTerminalLogs([
                "> Duel Protocol Initiated...",
                "> Opponent Connected: " + opponent,
                "> Waiting for input sequence..."
            ]);
        }
    }, [puzzle, opponent]);

    // --- ARENA CHANNEL FOR DUEL COMMUNICATION ---
    useEffect(() => {
        if (!user || !lobbyId) return;

        const channelName = `duel-arena-${lobbyId}`;

        const channel = supabase.channel(channelName, {
            config: { broadcast: { ack: true, self: false } }
        });
        arenaChannelRef.current = channel;

        channel
            .on('broadcast', { event: 'duel-withdraw' }, ({ payload }) => {

                if (payload.withdrawnBy !== user.id) {
                    // Opponent withdrew — this player wins!
                    setOpponentWithdrew(true);
                    const wagerAmount = parseInt(wager, 10) || 100;
                    updateExp(wagerAmount);
                }
            })
            .on('broadcast', { event: 'duel-complete' }, ({ payload }) => {

                if (payload.winnerId !== user.id) {
                    // Opponent solved it first — this player loses
                    setBattleOutcome('loss');
                    setIsFailed(true);
                    setResult({ type: 'error', message: `> ${opponent} solved the puzzle first! You lose.` });
                    setTimeout(() => {
                        setShowPostScene(true);
                    }, 1000);
                }
            })
            .subscribe((status) => {

            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, lobbyId]);

    // --- HANDLE TAB CLOSE / BROWSER CLOSE ---
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (arenaChannelRef.current && user) {
                // Best-effort broadcast on tab close
                arenaChannelRef.current.send({
                    type: 'broadcast',
                    event: 'duel-withdraw',
                    payload: {
                        withdrawnBy: user.id,
                        withdrawnName: user.name
                    }
                });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user]);

    const handleWithdraw = () => {
        playClick();
        setIsWithdrawModalOpen(true);
    };

    const handleConfirmWithdraw = async () => {
        playClick();
        setIsWithdrawModalOpen(false); // Instantly dismiss modal for responsive UI
        const wagerAmount = parseInt(wager, 10) || 100;
        updateExp(-wagerAmount);

        // Clean up the arena channel BEFORE broadcasting to prevent
        // our own listener from catching the withdrawal event
        const channelToClean = arenaChannelRef.current;
        arenaChannelRef.current = null;

        // Broadcast withdrawal to opponent on the arena channel
        // Use fire-and-forget so we don't block navigation
        if (channelToClean) {
            channelToClean.send({
                type: 'broadcast',
                event: 'duel-withdraw',
                payload: {
                    withdrawnBy: user.id,
                    withdrawnName: user.name
                }
            }).catch(err => {
                console.error('[ArenaBattle] Failed to send withdraw broadcast:', err);
            }).finally(() => {
                supabase.removeChannel(channelToClean);
            });
        }

        // Also broadcast player-leave on the LOBBY channel (fire-and-forget)
        if (lobbyId) {
            (async () => {
                try {
                    const lobbyChannel = supabase.channel(`duel-lobby-${lobbyId}`, {
                        config: { broadcast: { ack: true, self: false } }
                    });
                    await lobbyChannel.subscribe();
                    await lobbyChannel.send({
                        type: 'broadcast',
                        event: 'player-leave',
                        payload: { playerId: user.id }
                    });
                    await new Promise(resolve => setTimeout(resolve, 150));
                    supabase.removeChannel(lobbyChannel);
                } catch (err) {
                    console.error('[ArenaBattle] Failed to send lobby leave broadcast:', err);
                }
            })();
        }

        // Navigate IMMEDIATELY — don't wait for broadcasts to complete
        // Pass openDuelLobby state so user returns to the duel lobby, not the map
        navigate('/play', { replace: true, state: { openDuelLobby: true } });
    };

    const handleTimeout = () => {
        setResult({ type: 'error', message: '> CRITICAL FAILURE: TIME EXPIRED' });
        setIsFailed(true);

        const wagerAmount = parseInt(wager, 10) || 100;
        updateExp(-wagerAmount);
        setBattleOutcome('loss');

        setTimeout(() => {
            setShowPostScene(true);
        }, 1500);
    };

    const handleSubmit = () => {
        if (isFailed) return;

        let success = false;

        if (mode === 'code') {
            const expected = (puzzle?.expectedOutput || '').replace(/\s+/g, '').toLowerCase();
            const current = codeValue.replace(/\s+/g, '').toLowerCase();
            
            // Client-side hardcode evaluation demo: check for output pattern or sufficient text blocks
            if ((expected && current.includes(expected)) || codeValue.trim().length > 15) {
                success = true;
            } else {
                setResult({ type: 'error', message: '> Compilation Error: Invalid syntax or output mismatch.' });
                return;
            }
        } else {
            const expectedSequenceIDs = puzzle.correctSequence;
            const expectedContent = expectedSequenceIDs.map(id => {
                const block = puzzle.initialBlocks.find(b => b.id === id);
                return block ? block.content : null;
            });

            const isConnected = (b1, b2) => {
                const dx = b2.position.x - b1.position.x;
                const dy = b2.position.y - b1.position.y;
                const BLOCK_WIDTH = 140;
                const BLOCK_HEIGHT = 48;
                const isHoriz = Math.abs(dx - BLOCK_WIDTH) < 20 && Math.abs(dy) < 20;
                const isVert = Math.abs(dy - BLOCK_HEIGHT) < 20 && Math.abs(dx) < 20;
                return isHoriz || isVert;
            };

            const visited = new Set();
            const chains = [];

            for (const block of blocks) {
                if (visited.has(block.id)) continue;
                const chain = [];
                const queue = [block];
                visited.add(block.id);

                while (queue.length > 0) {
                    const current = queue.shift();
                    chain.push(current);
                    for (const potentialNeighbor of blocks) {
                        if (!visited.has(potentialNeighbor.id)) {
                            if (isConnected(current, potentialNeighbor) || isConnected(potentialNeighbor, current)) {
                                visited.add(potentialNeighbor.id);
                                queue.push(potentialNeighbor);
                            }
                        }
                    }
                }
                chains.push(chain);
            }

            for (const chain of chains) {
                chain.sort((a, b) => a.position.x - b.position.x);
                const chainContent = chain.map(b => b.content);
                if (chainContent.length === expectedContent.length) {
                    const isMatch = chainContent.every((content, index) => content === expectedContent[index]);
                    if (isMatch) success = true;
                }
            }
        }

        if (success) {
            setResult({ type: 'success', message: `> Execution Successful.` });
            setIsSuccess(true);

            const wagerAmount = parseInt(wager, 10) || 100;
            updateExp(wagerAmount);
            setBattleOutcome('win');

            // Broadcast to opponent that we completed the puzzle
            if (arenaChannelRef.current) {
                arenaChannelRef.current.send({
                    type: 'broadcast',
                    event: 'duel-complete',
                    payload: {
                        winnerId: user.id,
                        winnerName: user.name
                    }
                });
            }

            setTimeout(() => {
                setShowPostScene(true);
            }, 1000);

        } else {
            setResult({ type: 'error', message: `> Error: ${getRandomWittyError()} (Check your syntax logic)` });
            setIsSuccess(false);
        }
    };

    const handleDragEnd = (event) => {
        const { active, delta } = event;
        if (!active) return;

        setBlocks((currentBlocks) => {
            const index = currentBlocks.findIndex(b => b.id === active.id);
            if (index === -1) return currentBlocks;

            const newBlocks = [...currentBlocks];
            
            // Convert screen-space delta to canvas-space by dividing by scale
            let newX = newBlocks[index].position.x + (delta.x / canvasScale);
            let newY = newBlocks[index].position.y + (delta.y / canvasScale);

            // Clamp positions within the container bounds (using unscaled coordinates)
            const padding = 20;
            const containerW = containerRef.current ? containerRef.current.clientWidth / canvasScale : 2000;
            const containerH = containerRef.current ? containerRef.current.clientHeight / canvasScale : 1500;
            const maxWidth = containerW - 160;
            const maxHeight = containerH - 80;
            
            newX = Math.max(padding, Math.min(newX, maxWidth));
            newY = Math.max(padding, Math.min(newY, maxHeight));

            const updatedBlock = {
                ...newBlocks[index],
                position: { x: newX, y: newY }
            };
            const SNAP_THRESHOLD = 50; // Increased to 50 for consistent snapping
            const BLOCK_WIDTH = 140;
            const BLOCK_HEIGHT = 48;
            for (const other of newBlocks) {
                if (other.id === active.id) continue;
                const dx = updatedBlock.position.x - other.position.x;
                const dy = updatedBlock.position.y - other.position.y;
                if (Math.abs(dx - BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: Math.round(other.position.x + BLOCK_WIDTH), y: Math.round(other.position.y) };
                    playConnect();
                    break;
                }
                if (Math.abs(dx + BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: Math.round(other.position.x - BLOCK_WIDTH), y: Math.round(other.position.y) };
                    playConnect();
                    break;
                }
                if (Math.abs(dy - BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: Math.round(other.position.x), y: Math.round(other.position.y + BLOCK_HEIGHT) };
                    playConnect();
                    break;
                }
                if (Math.abs(dy + BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: Math.round(other.position.x), y: Math.round(other.position.y - BLOCK_HEIGHT) };
                    playConnect();
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

    const handleResetGame = () => {
        navigate('/play', { state: { openDuelLobby: true } });
    };

    return (
        <div className="w-full h-screen bg-[#0a0f1c] text-slate-200 overflow-hidden relative flex flex-col font-inter">
            {/* --- POST-GAME SCENE LAYER --- */}
            {showPostScene ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] flex items-center justify-center bg-black"
                >
                    <video
                        ref={videoRef}
                        src={postSceneVideo}
                        autoPlay
                        className="w-full h-full object-cover"
                        onTimeUpdate={(e) => {
                            if (!showBattle && e.target.currentTime >= 2.0) {
                                e.target.pause();
                                setShowBattle(true);
                            }
                        }}
                        onEnded={() => {
                            setShowVictory(true);
                        }}
                    />

                    {/* Battle Scene Overlay */}
                    {showBattle && (
                        <BattleScene
                            key="boss-battle"
                            level={30} // Force Boss1
                            outcome={battleOutcome}
                            isDuel={true}
                            onVideoResume={() => {
                                if (videoRef.current) {
                                    videoRef.current.play();
                                }
                            }}
                            onBattleEnd={() => {
                                setShowBattle(false);
                                setShowDefeat(true);
                            }}
                        />
                    )}

                    {/* Victory/Defeat Modals */}
                    <VictoryModal
                        isOpen={showVictory}
                        rewards={{ exp: parseInt(wager, 10) || 100 }}
                        onNextLevel={handleResetGame}
                        onReplay={handleResetGame}
                        isDuel={true}
                    />
                    <DefeatModal
                        isOpen={showDefeat}
                        losses={{ exp: parseInt(wager, 10) || 100 }}
                        onRetry={handleResetGame}
                    />
                </motion.div>
            ) : opponentWithdrew ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: 'spring', bounce: 0.4 }}
                        className="bg-[#0f0e17] border border-emerald-500/50 p-1 max-w-lg w-full relative"
                    >
                        <div className="absolute -inset-1 bg-emerald-600/20 blur animate-pulse" />
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500 z-20" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-500 z-20" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-500 z-20" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500 z-20" />
                        <div className="bg-[#0b0a10] p-8 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-50" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-emerald-500/50">
                                    <Trophy className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h2 className="text-3xl font-black text-emerald-400 mb-2 uppercase tracking-[0.2em] font-mono">
                                    VICTORY!
                                </h2>
                                <div className="h-px w-24 bg-emerald-500/50 my-4" />
                                <p className="text-emerald-200/80 font-mono text-sm mb-6 text-center leading-relaxed">
                                    Your opponent <span className="text-white font-bold">{opponent}</span> has withdrawn from the duel.
                                    You win by forfeit!
                                </p>
                                <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-lg mb-6 w-full flex items-center justify-center gap-3">
                                    <img src={expIcon} className="w-8 h-8 object-contain" alt="EXP" />
                                    <span className="text-3xl font-black text-emerald-400 font-mono">+{parseInt(wager, 10) || 100}</span>
                                    <span className="text-sm font-bold text-emerald-400 self-end mb-1">EXP</span>
                                </div>
                                <Button
                                    onClick={handleResetGame}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 uppercase tracking-widest font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                >
                                    Return to Lobby
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ) : loadingPuzzle ? (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md">
                    <div className="relative flex flex-col items-center gap-6">
                        <Loader2 className="w-16 h-16 text-cyan-500 animate-spin" />
                        <p className="text-cyan-400 font-mono text-sm uppercase tracking-[0.2em] animate-pulse font-bold">
                            Initializing Arena Protocol...
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* --- STANDARD GAME UI --- */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] pointer-events-none z-50 opacity-20" />

                    {/* Top HUD Bar */}
                    <div className="h-16 bg-[#050810] flex items-center justify-between px-6 border-b border-cyan-500/20 shrink-0 relative z-40">
                        <div className="flex items-center gap-8">
                            <CodeTimer
                                onExpire={handleTimeout}
                                onWarning={() => playCountdownVoice("Warning. 10 seconds remaining.")}
                            />
                        </div>

                        {/* Top Center: Progress/Versus Bar */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full flex items-center gap-8">
                            {/* Player Side (Left) */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg border border-cyan-500/50 bg-black/50 overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500" />
                                    <img
                                        src={user?.avatar}
                                        alt="Player"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {user?.rankIcon && <img src={user.rankIcon} alt="Rank" className="w-8 h-8 object-contain" />}
                                <div className="flex flex-col items-end">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-galsb text-[10px] text-cyan-300 tracking-wider uppercase">{user?.rankName || 'Novice'}</span>
                                        <span className="font-galsb text-sm text-white tracking-widest uppercase">{user?.name || 'Player'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="font-galsb text-red-500 italic text-xl animate-pulse">VS</div>
                            {/* Opponent Side (Right) */}
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-start">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-galsb text-sm text-white tracking-widest uppercase">{opponent}</span>
                                        <span className="font-galsb text-[10px] text-red-400 tracking-wider uppercase">{opponentRankName || 'Novice'}</span>
                                    </div>
                                </div>
                                {opponentRankIcon && <img src={opponentRankIcon} alt="Rank" className="w-8 h-8 object-contain" />}
                                <div className="w-10 h-10 rounded-lg border border-red-500/50 bg-black/50 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-500" />
                                    <img
                                        src={opponentAvatar}
                                        alt="Opponent"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={handleWithdraw}
                                className="text-cyan-700 hover:text-cyan-400 transition-colors p-2 hover:bg-cyan-900/20 rounded-full group flex items-center gap-2"
                                title="Withdraw"
                            >
                                <span className="text-[10px] uppercase font-bold tracking-widest hidden group-hover:inline-block">Withdraw</span>
                                <X className="w-8 h-8" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden relative z-30">
                        {/* Puzzle Area */}
                        <div className="flex-[3] bg-[#0c1221] relative overflow-hidden flex flex-col" ref={containerRef}>
                            <div className="absolute inset-0 opacity-10 pointer-events-none"
                                style={{
                                    backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
                                    backgroundSize: '40px 40px'
                                }}
                            />
                            <div className="w-full p-6 z-10 relative shrink-0">
                                <div className="bg-slate-900/80 backdrop-blur-md border-l-4 border-cyan-500 p-4 max-w-3xl shadow-lg">
                                    <h2 className="text-cyan-500 uppercase tracking-widest text-xs font-bold mb-1 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-cyan-500" /> Directive
                                    </h2>
                                    <p className="text-cyan-100 text-lg font-medium leading-relaxed font-mono">{puzzle?.description}</p>
                                </div>
                            </div>
                            {mode === 'code' ? (
                                <div className="relative w-full flex-1 overflow-hidden">
                                    <div className="w-full h-full p-6 font-mono flex flex-col items-center justify-center">
                                        <div className="w-full max-w-4xl h-full flex flex-col shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                                            <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/50 rounded-t-lg p-4 text-cyan-400 font-bold uppercase tracking-widest text-sm flex items-center justify-between">
                                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />IDE Terminal</span>
                                                <span className="text-xs text-cyan-500 font-mono px-3 py-1 bg-cyan-950/50 rounded-md border border-cyan-500/30">{language}</span>
                                            </div>
                                            <div className="w-full flex-1 bg-[#060913]/90 backdrop-blur-sm border-x border-b border-cyan-500/30 rounded-b-lg overflow-hidden flex relative font-mono text-lg">
                                                {/* Line Numbers Sidebar */}
                                                <div 
                                                    id="ide-line-numbers"
                                                    className="w-12 py-6 pr-3 bg-slate-900/50 border-r border-cyan-500/20 text-cyan-700/60 text-right select-none overflow-hidden shrink-0"
                                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                                >
                                                    {Array.from({ length: Math.max((codeValue || '').split('\n').length, 1) }, (_, i) => (
                                                        <div key={i} className="h-[28px] leading-[28px]">{i + 1}</div>
                                                    ))}
                                                </div>
                                                
                                                {/* Textarea Code Editor */}
                                                <textarea
                                                    value={codeValue}
                                                    onChange={(e) => setCodeValue(e.target.value)}
                                                    onScroll={(e) => {
                                                        const lines = document.getElementById('ide-line-numbers');
                                                        if (lines) lines.scrollTop = e.target.scrollTop;
                                                    }}
                                                    className="w-full h-full p-6 text-cyan-100 bg-transparent focus:outline-none focus:ring-0 resize-none custom-scrollbar whitespace-pre placeholder-cyan-800/60 focus:placeholder-transparent"
                                                    style={{ lineHeight: '28px' }}
                                                    placeholder={`// Write your ${language} code sequence here...\n// Objective: ${puzzle?.description?.substring(0, 50)}...\n\n`}
                                                    spellCheck={false}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <DndContext 
                                    sensors={sensors} 
                                    onDragEnd={handleDragEnd} 
                                    modifiers={[customModifier]}
                                >
                                    <div className="relative w-full flex-1 overflow-hidden">
                                        {/* Zoom Controls */}
                                        <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2">
                                            <button 
                                                onClick={() => setCanvasScale(s => Math.max(0.6, +(s - 0.1).toFixed(1)))} 
                                                disabled={canvasScale <= 0.6}
                                                className="w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 flex items-center justify-center rounded-lg text-cyan-400 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ZoomOut className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => setCanvasScale(getScaleForBlockCount(blocks.length))} 
                                                className="w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 flex items-center justify-center rounded-lg text-cyan-400 transition-all shadow-lg"
                                            >
                                                <Maximize className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => setCanvasScale(s => Math.min(1, +(s + 0.1).toFixed(1)))} 
                                                disabled={canvasScale >= 1}
                                                className="w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 flex items-center justify-center rounded-lg text-cyan-400 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ZoomIn className="w-5 h-5" />
                                            </button>
                                            <div className="px-3 py-1.5 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-lg">
                                                <span className="text-cyan-400 font-mono text-xs font-bold tracking-wider">{Math.round(canvasScale * 100)}%</span>
                                            </div>
                                        </div>

                                        {/* Scaled blocks container */}
                                        <div 
                                            className="w-full h-full origin-top-left"
                                            style={{ transform: `scale(${canvasScale})`, width: `${100 / canvasScale}%`, height: `${100 / canvasScale}%` }}
                                        >
                                            <div className="relative w-full h-full p-8">
                                                {blocks.map((block) => (
                                                    <PuzzleBlock key={block.id} {...block} variant={mode} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </DndContext>
                            )}
                        </div>

                        {/* Control Console */}
                        <div className="flex-1 min-w-[350px] max-w-[400px] bg-[#080b14] border-l border-cyan-500/20 flex flex-col relative z-40 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                                <div className="bg-cyan-950/10 border border-cyan-500/20 p-4 relative group">
                                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/50" />
                                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/50" />
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-full" />
                                            <img src={expIcon} className="w-12 h-12 object-contain relative z-10" alt="EXP" />
                                        </div>
                                        <div>
                                            <div className="text-cyan-500 text-[10px] uppercase tracking-widest font-bold">EXP WAGER</div>
                                            <div className="text-white font-mono text-xl font-bold">+ {currentReward} EXP</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-cyan-600 uppercase tracking-widest text-[10px] font-bold flex items-center gap-2">
                                        <Trophy className="w-3 h-3" /> Target Signature
                                    </h3>
                                    <div className="font-mono text-emerald-400 text-lg font-bold bg-black/60 p-4 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden">
                                        <div className="relative z-10">{puzzle?.expectedOutput}</div>
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/20 animate-scan-fast pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex-1 min-h-[150px] bg-black border border-slate-800 p-4 font-mono text-xs text-slate-400 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 px-2 py-0.5 bg-slate-800 text-[9px] uppercase tracking-wider text-slate-300">Terminal</div>
                                    <div className="mt-4 space-y-1">
                                        {terminalLogs.map((log, i) => (
                                            <div key={i} className={`font-mono text-[11px] ${log.includes('ERROR') ? 'text-red-400' : 'text-slate-500'}`}>
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

                            <div className="p-6 bg-[#0c1221] border-t border-cyan-500/20">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSuccess}
                                    className={`w-full py-5 text-lg font-black tracking-widest uppercase flex items-center justify-center gap-3 relative overflow-hidden group transition-all duration-300
                                        ${isSuccess
                                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_30px_rgba(8,145,178,0.4)]'
                                        }`}
                                >
                                    <Play className={`w-5 h-5 fill-current ${isSuccess ? '' : 'group-hover:scale-110 transition-transform'}`} />
                                    {isSuccess ? 'SEQUENCE COMPLETE' : 'EXECUTE'}
                                    {!isSuccess && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Withdraw Confirmation Modal */}
                    <AnimatePresence>
                        {isWithdrawModalOpen && !showPostScene && (
                            <div className="absolute inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                    className="bg-[#0f0e17] border border-red-500/50 p-1 max-w-lg w-full relative group"
                                >
                                    <div className="absolute -inset-1 bg-red-600/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500 z-20" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500 z-20" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500 z-20" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500 z-20" />

                                    <div className="bg-[#0b0a10] p-8 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-50" />

                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse ring-1 ring-red-500/50">
                                                <X className="w-8 h-8 text-red-500" />
                                            </div>

                                            <h2 className="text-3xl font-black text-red-500 mb-2 uppercase tracking-[0.2em] font-mono glitch-text" data-text="SYSTEM ABORT">
                                                WITHDRAW GAME?
                                            </h2>
                                            <div className="h-px w-24 bg-red-500/50 my-4" />

                                            <p className="text-red-200/80 font-mono text-sm mb-8 leading-relaxed max-w-sm">
                                                WARNING: Terminating this duel will result in immediate forfeiture.
                                                Protocol dictates penalty assessment.
                                            </p>

                                            <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-lg mb-8 w-full relative overflow-hidden">
                                                <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                                                <div className="relative flex flex-col items-center">
                                                    <span className="text-red-400 text-[10px] uppercase tracking-widest font-bold mb-1">PENALTY ASSESSMENT</span>
                                                    <div className="flex items-center justify-center gap-3">
                                                        <img src={expIcon} className="w-8 h-8 object-contain filter grayscale contrast-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" alt="" />
                                                        <span className="text-4xl font-black text-red-500 font-mono tracking-tighter">-{parseInt(wager, 10) || 100}</span>
                                                        <span className="text-sm font-bold text-red-400 self-end mb-2">EXP</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 w-full">
                                                <Button
                                                    onClick={() => {
                                                        playClick();
                                                        setIsWithdrawModalOpen(false);
                                                    }}
                                                    className="bg-slate-800 hover:bg-slate-700 border-l-4 border-slate-600 hover:border-cyan-400 text-slate-300 py-4 uppercase tracking-widest font-bold text-xs"
                                                >
                                                    Continue
                                                </Button>
                                                <Button
                                                    onClick={handleConfirmWithdraw}
                                                    className="bg-red-600/20 hover:bg-red-600 border-l-4 border-red-500 text-red-500 hover:text-black py-4 uppercase tracking-widest font-bold text-xs shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300"
                                                >
                                                    Withdraw Game
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
};

export default ArenaBattle;
