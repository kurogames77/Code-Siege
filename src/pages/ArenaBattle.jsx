
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Trophy } from 'lucide-react'; // Lightbulb removed
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

const ArenaBattle = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { opponent = 'Unknown Recruiter', language = 'JavaScript', wager = '100' } = location.state || {};

    // Mimic ChallengeModal State
    const [blocks, setBlocks] = useState([]);
    const [result, setResult] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isFailed, setIsFailed] = useState(false);

    // Hints Removed - Logic Simplified
    const [currentReward, setCurrentReward] = useState(parseInt(wager, 10) || 100);
    const [terminalLogs, setTerminalLogs] = useState([]);

    // Unused state removed: codeValue
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const { user, updateExp } = useUser();

    // Battle Scene States
    const [showPostScene, setShowPostScene] = useState(false);
    const [showBattle, setShowBattle] = useState(false);
    const [battleOutcome, setBattleOutcome] = useState('win'); // 'win' | 'loss'
    const [showVictory, setShowVictory] = useState(false);
    const [showDefeat, setShowDefeat] = useState(false);
    const videoRef = useRef(null);

    // Level/Mode
    const level = 1;
    const mode = level >= 21 ? 'code' : level >= 11 ? 'brick' : 'jigsaw';

    const sensors = useSensors(useSensor(PointerSensor));
    const containerRef = useRef(null);
    const { playConnect, playCountdownVoice, playClick } = useSound();

    // Mock Puzzle data
    const puzzle = {
        description: "Arrange the blocks to calculate the total power output.",
        expectedOutput: "Total Power: 500",
        initialBlocks: [
            { id: 'b1', content: 'var power = 100;', type: 'variable' },
            { id: 'b2', content: 'var multiplier = 5;', type: 'variable' },
            { id: 'b3', content: 'console.log("Total Power: " + (power * multiplier));', type: 'print' }
        ],
        correctSequence: ['b1', 'b2', 'b3'],
        rewards: { exp: parseInt(wager, 10) || 100 }
        // Hints removed from object usage
    };

    useEffect(() => {
        if (puzzle && puzzle.initialBlocks) {
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
            setTerminalLogs([
                "> Duel Protocol Initiated...",
                "> Opponent Connected: " + opponent,
                "> Waiting for input sequence..."
            ]);
        }
    }, [opponent]); // Added opponent dependency

    const handleWithdraw = () => {
        playClick();
        setIsWithdrawModalOpen(true);
    };

    const handleConfirmWithdraw = () => {
        playClick();
        const wagerAmount = parseInt(wager, 10) || 100;
        updateExp(-wagerAmount);
        navigate('/play', { state: { openDuelLobby: true } });
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

        const expectedSequenceIDs = puzzle.correctSequence;
        const expectedContent = expectedSequenceIDs.map(id => {
            const block = puzzle.initialBlocks.find(b => b.id === id);
            return block ? block.content : null;
        });

        const isConnected = (b1, b2) => {
            const dx = b2.position.x - b1.position.x;
            const dy = b2.position.y - b1.position.y;
            const BLOCK_WIDTH = 180;
            const BLOCK_HEIGHT = 60;
            const isHoriz = Math.abs(dx - BLOCK_WIDTH) < 10 && Math.abs(dy) < 10;
            const isVert = Math.abs(dy - BLOCK_HEIGHT) < 10 && Math.abs(dx) < 10;
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

        let success = false;
        for (const chain of chains) {
            chain.sort((a, b) => a.position.x - b.position.x);
            const chainContent = chain.map(b => b.content);
            if (chainContent.length === expectedContent.length) {
                const isMatch = chainContent.every((content, index) => content === expectedContent[index]);
                if (isMatch) success = true;
            }
        }

        if (success) {
            setResult({ type: 'success', message: `> Execution Successful.` });
            setIsSuccess(true);

            const wagerAmount = parseInt(wager, 10) || 100;
            updateExp(wagerAmount);
            setBattleOutcome('win');

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
            const updatedBlock = {
                ...newBlocks[index],
                position: {
                    x: newBlocks[index].position.x + delta.x,
                    y: newBlocks[index].position.y + delta.y
                }
            };
            const SNAP_THRESHOLD = 30;
            const BLOCK_WIDTH = 180;
            const BLOCK_HEIGHT = 60;
            for (const other of newBlocks) {
                if (other.id === active.id) continue;
                const dx = updatedBlock.position.x - other.position.x;
                const dy = updatedBlock.position.y - other.position.y;
                if (Math.abs(dx - BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x + BLOCK_WIDTH, y: other.position.y };
                    playConnect();
                    break;
                }
                if (Math.abs(dx + BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x - BLOCK_WIDTH, y: other.position.y };
                    playConnect();
                    break;
                }
                if (Math.abs(dy - BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x, y: other.position.y + BLOCK_HEIGHT };
                    playConnect();
                    break;
                }
                if (Math.abs(dy + BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                    updatedBlock.position = { x: other.position.x, y: other.position.y - BLOCK_HEIGHT };
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
                    />
                    <DefeatModal
                        isOpen={showDefeat}
                        losses={{ exp: parseInt(wager, 10) || 100 }}
                        onRetry={handleResetGame}
                    />
                </motion.div>
            ) : (
                <>
                    {/* --- STANDARD GAME UI --- */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] pointer-events-none z-50 opacity-20" />

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
                            {/* HINT BUTTON REMOVED */}
                        </div>

                        {/* Top Center: Progress/Versus Bar */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full flex items-center gap-8">
                            {/* Player Side (Left) */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 border border-cyan-500/50 bg-black/50 p-0.5 relative">
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500" />
                                    <img
                                        src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                        alt="Player"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col items-end min-w-[140px]">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className="font-galsb text-[10px] text-cyan-300 tracking-wider uppercase">{user?.rank || 'Novice'}</span>
                                        <span className="font-galsb text-sm text-white tracking-widest uppercase">{user?.name || 'Player'}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800/80 skew-x-[-10deg] p-[1px] relative overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: "45%" }}
                                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                                        />
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,#000_2px)] bg-[size:4px_100%] opacity-30" />
                                    </div>
                                </div>
                            </div>
                            <div className="font-galsb text-red-500 italic text-xl animate-pulse">VS</div>
                            {/* Opponent Side (Right) */}
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-start min-w-[140px]">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className="font-galsb text-sm text-white tracking-widest uppercase">{opponent}</span>
                                        <span className="font-galsb text-[10px] text-red-400 tracking-wider uppercase">VETERAN</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800/80 skew-x-[-10deg] p-[1px] relative overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: "65%" }}
                                            className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                                        />
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,#000_2px)] bg-[size:4px_100%] opacity-30" />
                                    </div>
                                </div>
                                <div className="w-10 h-10 border border-red-500/50 bg-black/50 p-0.5 relative">
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-500" />
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent}`}
                                        alt="Opponent"
                                        className="w-full h-full object-cover grayscale opacity-80"
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

                            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                <div className="relative w-full flex-1 p-12 overflow-y-auto custom-scrollbar">
                                    {blocks.map((block) => (
                                        <PuzzleBlock key={block.id} {...block} variant={mode} />
                                    ))}
                                </div>
                            </DndContext>
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
