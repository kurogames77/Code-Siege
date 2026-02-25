
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Swords, Trophy, Clock, X, User, Shield, Zap, Play } from 'lucide-react';
import PuzzleBlock from '../components/game/PuzzleBlock';
import CodeTimer from '../components/game/CodeTimer';
import Button from '../components/ui/Button';

// Assets
import gameCodeBg from '../assets/gamecodebg.jpg';
import gemIcon from '../assets/gem.png';
import heroAsset from '../assets/hero1.png';
import expIcon from '../assets/exp.png';
import postSceneVideo from '../assets/postsceneview.mp4';

// Components
import BattleScene from '../components/game/BattleScene';
import VictoryModal from '../components/game/VictoryModal';
import DefeatModal from '../components/game/DefeatModal';

import { useUser } from '../contexts/UserContext';
import useSound from '../hooks/useSound';

const GrandArena = () => {
    const { battleId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { opponents = [], language = 'Python', wager = '0' } = location.state || {};
    const { user, updateExp } = useUser();
    const { playClick } = useSound();

    // Components for the 5-player layout
    const [players, setPlayers] = useState([]);

    // Initialize players state from location state
    useEffect(() => {
        if (location.state?.players) {
            setPlayers(location.state.players.map(p => ({
                ...p,
                progress: 0,
                isWin: false
            })));
        } else {
            // Mock data for direct access
            // Only set if not already set to avoid resets
            setPlayers(prev => {
                if (prev.length > 0) return prev;
                return [
                    { id: user?.id || 1, name: user?.name || 'OPERATIVE', progress: 0, isWin: false, avatar: user?.avatar || heroAsset },
                    { id: 101, name: 'CyberKnight_99', progress: 0, isWin: false, avatar: heroAsset },
                    { id: 102, name: 'LogicQueen', progress: 0, isWin: false, avatar: heroAsset },
                    { id: 103, name: 'CodeSlinger', progress: 0, isWin: false, avatar: heroAsset },
                    { id: 104, name: 'ByteWizard', progress: 0, isWin: false, avatar: heroAsset }
                ];
            });
        }
    }, [location.state]); // Removed user from dependencies to prevent reset on EXP update

    const [blocks, setBlocks] = useState([]);

    // Battle Scene States
    const [showPostScene, setShowPostScene] = useState(false);
    const [showBattle, setShowBattle] = useState(false);
    const [battleOutcome, setBattleOutcome] = useState('win'); // 'win' | 'loss'
    const [showVictory, setShowVictory] = useState(false);
    const [showDefeat, setShowDefeat] = useState(false);
    const videoRef = useRef(null);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState([
        "> Grand Arena Protocol Initiated...",
        "> Synchronizing Operatives across the RIFT...",
        `> Tactical Wager detected: ${wager} GEMS STAKED.`,
        "> Waiting for input sequence..."
    ]);

    // Game Logic State
    const [isSuccess, setIsSuccess] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    const [result, setResult] = useState(null);

    const containerRef = useRef(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Mock Puzzle Data
    const puzzle = {
        title: "Power Grid Optimization",
        description: "Calculate the total power output by multiplying the base power (100) by the multiplier (X).",
        expectedOutput: "Total Power: 500",
        initialBlocks: [
            { id: 'b1', content: 'total_power = 100 * x', type: 'function' },
            { id: 'b2', content: 'print(f"Total Power: {total_power}")', type: 'string' },
            { id: 'b3', content: 'x = 10', type: 'keyword' }
        ]
    };

    useEffect(() => {
        // Initialize blocks with spread out positions
        const initialized = puzzle.initialBlocks.map((b, i) => ({
            ...b,
            position: {
                x: 100 + (i % 2) * 250,
                y: 250 + Math.floor(i / 2) * 120
            }
        }));
        setBlocks(initialized);
    }, []);

    // Simulate Opponent Progress
    useEffect(() => {
        if (isSuccess || isFailed || showPostScene) return;

        const interval = setInterval(() => {
            setPlayers(currentPlayers => {
                // If the player has already won, stop all simulation
                if (currentPlayers.find(p => p.id === user?.id && p.progress >= 100)) return currentPlayers;

                let someoneWon = false;
                const newPlayers = currentPlayers.map(p => {
                    if (p.id === user?.id || p.progress >= 100) return p;

                    const increment = Math.random() * 2.5;
                    const newProgress = Math.min(100, p.progress + increment);

                    if (newProgress >= 100) someoneWon = true;

                    return { ...p, progress: newProgress };
                });

                if (someoneWon) {
                    setIsFailed(true);
                    setResult({ type: 'error', message: "ARENA DEFEATED - AN OPPONENT BREACHED THE SYSTEM!" });

                    // TRIGGER DEFEAT FLOW
                    const wagerAmount = parseInt(wager, 10) || 0;
                    // Deduct logic handled in Battle/Defeat flow typically, 
                    // but here we mark outcome first
                    setBattleOutcome('loss');
                    updateExp(-wagerAmount);

                    setTimeout(() => {
                        setShowPostScene(true);
                    }, 1500);
                }

                return newPlayers;
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [isSuccess, isFailed, showPostScene, wager, updateExp]);

    const handleDragEnd = (event) => {
        const { active, delta } = event;
        setBlocks((prev) =>
            prev.map((block) =>
                block.id === active.id
                    ? {
                        ...block,
                        position: {
                            x: (block.position?.x || 0) + delta.x,
                            y: (block.position?.y || 0) + delta.y
                        }
                    }
                    : block
            )
        );
    };

    const handleSubmit = () => {
        // Logic to check block sequence (simplified for now)
        const sortedBlocks = [...blocks].sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
        const code = sortedBlocks.map(b => b.content).join('\n');

        if (code.includes('x = 5') || true) { // Mocking success
            setIsSuccess(true);
            setPlayers(prev => prev.map(p => p.id === user?.id ? { ...p, progress: 100 } : p));
            setResult({ type: 'success', message: "SYSTEM STABILIZED - RIFT SECURED!" });

            // TRIGGER VICTORY FLOW
            setBattleOutcome('win');
            const wagerAmount = parseInt(wager, 10) || 0;
            updateExp(wagerAmount);

            setTimeout(() => {
                setShowPostScene(true);
            }, 1000);
        }
    };

    const handleWithdrawClick = () => {
        playClick();
        setIsWithdrawModalOpen(true);
    };

    const handleConfirmWithdraw = () => {
        playClick();
        const wagerAmount = parseInt(wager, 10) || 0;
        updateExp(-wagerAmount);
        navigate('/play', { state: { openMultiplayerLobby: true } });
    };

    const handleResetGame = () => {
        navigate('/play', { state: { openMultiplayerLobby: true } });
    };

    const handleTimeout = () => {
        setIsFailed(true);
        setResult({ type: 'error', message: "> CRITICAL FAILURE: TIME EXPIRED" });
        setBattleOutcome('loss');
        const wagerAmount = parseInt(wager, 10) || 0;
        updateExp(-wagerAmount);
        setTimeout(() => setShowPostScene(true), 1500);
    };

    return (
        <div className="min-h-screen bg-[#020617] relative overflow-hidden font-inter text-slate-200"
            style={{ backgroundImage: `url(${gameCodeBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>

            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-0" />

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
                            key="boss-battle-grand"
                            level={30} // Boss Battle for Grand Arena Finale
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

                    {/* Victory Modal */}
                    <VictoryModal
                        isOpen={showVictory}
                        rewards={{ exp: parseInt(wager, 10) || 0 }}
                        onNextLevel={handleResetGame}
                        onReplay={handleResetGame}
                    />

                    {/* Defeat Modal */}
                    <DefeatModal
                        isOpen={showDefeat}
                        losses={{ exp: parseInt(wager, 10) || 0 }}
                        onRetry={handleResetGame}
                    />
                </motion.div>
            ) : (
                <>
                    {/* Arena Header (5-Player Dashboard) */}
                    <header className="relative z-50 bg-[#050810] border-b border-cyan-500/20 px-4 h-16 flex items-center shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
                                <span className="text-cyan-500 font-mono text-[10px] tracking-[0.2em] uppercase">GrandArena_Active</span>
                            </div>
                            <div className="h-6 w-px bg-cyan-900/50" />
                            <CodeTimer onExpire={handleTimeout} />
                        </div>

                        {/* Competitor Grid */}
                        <div className="flex-1 flex items-center justify-center gap-6 px-4">
                            {players.map((player) => {
                                const isSelf = player.id === user?.id;
                                return (
                                    <div key={player.id} className="flex items-center gap-2">
                                        <div className={`w-8 h-8 border ${isSelf ? 'border-cyan-500/50' : 'border-slate-700/50'} bg-black/50 p-0.5 relative`}>
                                            <div className={`absolute top-0 ${isSelf ? 'left-0 border-t border-l border-cyan-500' : 'right-0 border-t border-r border-slate-500'} w-1.5 h-1.5`} />
                                            <img src={player.avatar} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="flex flex-col min-w-[100px]">
                                            <div className="flex items-baseline gap-1.5 mb-0.5">
                                                <span className={`font-galsb text-[8px] tracking-wider uppercase ${isSelf ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                    {isSelf ? 'NOVICE' : 'AGENT'}
                                                </span>
                                                <span className={`font-galsb text-[10px] tracking-widest uppercase truncate max-w-[80px] ${isSelf ? 'text-white' : 'text-slate-300'}`}>
                                                    {player.name}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800/80 skew-x-[-10deg] p-[1px] relative overflow-hidden">
                                                <motion.div
                                                    className={`h-full ${isSelf ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-rose-500'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${player.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Controls - Withdraw */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                                <img src={gemIcon} className="w-4 h-4 object-contain" alt="gem" />
                                <span className="text-amber-500 font-mono text-xs font-bold leading-none">{wager} GEMS</span>
                            </div>
                            <button
                                onClick={handleWithdrawClick}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </header>

                    <main className="relative z-10 flex-1 flex h-[calc(100vh-105px)] overflow-hidden">
                        {/* Left: Coding Area */}
                        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.03)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                            <div className="w-full p-6 z-20 relative shrink-0">
                                <div className="bg-slate-900/80 backdrop-blur-md border-l-4 border-cyan-500 p-4 max-w-2xl shadow-lg ring-1 ring-white/5">
                                    <h3 className="text-cyan-500 uppercase tracking-widest text-[10px] font-bold mb-1 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-cyan-500" /> DIRECTIVE
                                    </h3>
                                    <p className="text-cyan-100 text-lg font-medium leading-relaxed font-mono">
                                        {puzzle.description}
                                    </p>
                                </div>
                            </div>

                            <DndContext id="grand-arena-dnd" sensors={sensors} onDragEnd={handleDragEnd}>
                                <div className="p-8 w-full h-full">
                                    {blocks.map((block) => (
                                        <PuzzleBlock key={block.id} {...block} />
                                    ))}
                                </div>
                            </DndContext>
                        </div>

                        {/* Control Console */}
                        <div className="w-[380px] bg-[#080b14] border-l border-white/10 p-6 flex flex-col gap-6 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] relative z-40">
                            {/* EXP Wager */}
                            <div className="bg-cyan-950/10 border border-cyan-500/20 p-4 relative group">
                                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/50" />
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/50" />
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-full" />
                                        <img src={expIcon} className="w-10 h-10 object-contain relative z-10" alt="EXP" />
                                    </div>
                                    <div>
                                        <div className="text-cyan-500 text-[10px] uppercase tracking-widest font-bold">EXP WAGER</div>
                                        <div className="text-white font-mono text-lg font-bold">+ {wager} EXP</div>
                                    </div>
                                </div>
                            </div>

                            {/* Target Output */}
                            <div className="space-y-2">
                                <h3 className="text-cyan-600 uppercase tracking-widest text-[10px] font-bold flex items-center gap-2">
                                    <Trophy className="w-3 h-3" /> Target Signature
                                </h3>
                                <div className="bg-black/60 border border-emerald-500/20 p-4 font-mono text-lg font-bold text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden">
                                    {puzzle.expectedOutput}
                                    <div className="absolute top-0 left-0 right-0 h-px bg-emerald-500/20 animate-scan-fast" />
                                </div>
                            </div>

                            {/* Battle Log / Terminal */}
                            <div className="flex-1 bg-black border border-white/5 p-4 font-mono text-xs text-slate-500 relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 left-0 px-2 py-0.5 bg-slate-800 text-[9px] uppercase tracking-wider text-slate-300">Terminal</div>
                                <div className="mt-4 space-y-1">
                                    {terminalLogs.map((log, i) => (
                                        <div key={i} className="text-[11px] opacity-60">
                                            {log}
                                        </div>
                                    ))}
                                    {result && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`mt-4 pt-4 border-t border-dashed ${result.type === 'success' ? 'border-emerald-500/50' : 'border-rose-500/50'}`}
                                        >
                                            <div className={`font-bold ${result.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {result.type === 'success' ? '>> SUCCESS VERIFIED' : '>> ERROR DETECTED'}
                                            </div>
                                            <div className={result.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}>
                                                {result.message}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSuccess || isFailed}
                                    className={`w-full py-5 text-lg font-black tracking-widest uppercase flex items-center justify-center gap-3 relative overflow-hidden group transition-all duration-300
                                        ${isSuccess
                                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                                            : 'bg-[#7c3aed] hover:bg-[#8b5cf6] text-white shadow-[0_0_30px_rgba(124,58,237,0.4)]'
                                        }`}
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    {isSuccess ? 'SEQUENCE COMPLETE' : 'EXECUTE'}
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                </Button>
                            </div>
                        </div>
                    </main>

                    {/* Withdraw Confirmation Modal */}
                    <AnimatePresence>
                        {isWithdrawModalOpen && !showPostScene && (
                            <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                    className="bg-[#0f0e17] border border-red-500/50 p-1 max-w-lg w-full relative group"
                                >
                                    {/* Animated Glitch Borders */}
                                    <div className="absolute -inset-1 bg-red-600/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500 z-20" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500 z-20" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500 z-20" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500 z-20" />

                                    <div className="bg-[#0b0a10] p-8 relative overflow-hidden">
                                        {/* Moving Scanline background */}
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
                                                        <span className="text-4xl font-black text-red-500 font-mono tracking-tighter">-{parseInt(wager, 10) || 0}</span>
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

export default GrandArena;
