
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Swords, Trophy, Clock, X, User, Shield, Zap, Play, ZoomIn, ZoomOut, Maximize, Sun, Moon } from 'lucide-react';
import PuzzleBlock from '../components/game/PuzzleBlock';
import CodeTimer from '../components/game/CodeTimer';
import Button from '../components/ui/Button';
import supabase from '../lib/supabase';

// Assets
import gameCodeBg from '../assets/gamecodebg.jpg';
import gemIcon from '../assets/gem.png';
import heroAsset from '../assets/hero1.png';
import hero1aStatic from '../assets/hero1a.png';
import hero2Static from '../assets/hero2.png';
import hero3Static from '../assets/hero3.png';
import hero4Static from '../assets/hero4.png';
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

    const [theme, setTheme] = useState('dark');

    const heroMap = {
        'hero1a.png': hero1aStatic,
        'hero2.png': hero2Static,
        'hero3.png': hero3Static,
        'hero4.png': hero4Static,
        'hero1.png': heroAsset
    };

    // Initialize players state from location state
    useEffect(() => {
        if (location.state?.opponents && location.state.opponents.length > 0) {
            const userHeroImageKey = localStorage.getItem('selectedHeroImage') || 'hero2.png';
            const userHeroImage = heroMap[userHeroImageKey] || hero2Static;
            const selfPlayer = {
                id: user?.id || 1,
                name: user?.name || 'OPERATIVE',
                progress: 0,
                isWin: false,
                avatar: user?.avatar_url || user?.avatar || userHeroImage,
                rankName: getRankData(user?.xp || 0).name || 'OPERATIVE'
            };
            const others = location.state.opponents.map(o => ({
                ...o,
                progress: 0,
                isWin: false,
                avatar: o.avatar || o.heroImage || (o.heroImageKey ? heroMap[o.heroImageKey] : null) || heroAsset
            }));
            setPlayers([selfPlayer, ...others]);
        } else {
            // Mock data for direct access
            setPlayers(prev => {
                if (prev.length > 0) return prev;
                return [
                    { id: user?.id || 1, name: user?.name || 'OPERATIVE', progress: 0, isWin: false, avatar: user?.avatar_url || user?.avatar || heroAsset },
                    { id: 101, name: 'CyberKnight_99', progress: 0, isWin: false, avatar: heroAsset }
                ];
            });
        }
    }, [location.state, user]);

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

    // Calculate initial scale based on block count (clamped to 60%-100%)
    const getScaleForBlockCount = (count) => {
        if (count <= 3) return 1;
        if (count <= 5) return 0.85;
        if (count <= 8) return 0.7;
        return 0.6;
    };

    const [canvasScale, setCanvasScale] = useState(1);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Helper to get rank names locally if missing from user map
    const getRankData = (xp) => {
        if (xp >= 50000) return { name: 'Sudo Master' };
        if (xp >= 30000) return { name: 'Root Override' };
        if (xp >= 15000) return { name: 'Cyber Knight' };
        if (xp >= 5000) return { name: 'Binary Apprentice' };
        if (xp >= 1000) return { name: 'Code Initiate' };
        return { name: 'Siege Novice' };
    };

    // Mock Puzzle Data
    const puzzle = {
        title: "Power Grid Optimization",
        description: "Calculate the total power output.",
        expectedOutput: "Total Power: 500",
        initialBlocks: [
            { id: 'b1', content: 'power = 100 * x', type: 'function' },
            { id: 'b2', content: 'print(power)', type: 'string' },
            { id: 'b3', content: 'x = 5', type: 'keyword' }
        ]
    };

    useEffect(() => {
        // Initialize blocks with spread out positions
        const initialized = puzzle.initialBlocks.map((b, i) => ({
            ...b,
            position: {
                x: 100 + (i % 2) * 250,
                y: 100 + Math.floor(i / 2) * 120
            }
        }));
        setBlocks(initialized);
        setCanvasScale(getScaleForBlockCount(initialized.length));
    }, []);

    const arenaChannelRef = useRef(null);

    // --- REALTIME MULTIPLAYER SYNC ---
    useEffect(() => {
        if (!user || players.length === 0 || isSuccess || isFailed || showPostScene) return;

        // Generate deterministic channel name based on party members
        const partyIds = players.map(p => p.id).sort();
        const channelName = `grand-arena-${partyIds.join('-')}`;

        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { ack: true, self: false }
            }
        });
        arenaChannelRef.current = channel;

        channel
            .on('broadcast', { event: 'arena-progress' }, ({ payload }) => {
                setPlayers(current => current.map(p => {
                    if (p.id === payload.playerId) {
                        return { ...p, progress: payload.progress };
                    }
                    return p;
                }));
            })
            .on('broadcast', { event: 'arena-complete' }, ({ payload }) => {
                if (payload.winnerId !== user.id) {
                    setIsFailed(true);
                    setResult({ type: 'error', message: `> ${payload.winnerName || 'An opponent'} solved the puzzle first! You lose.` });
                    setBattleOutcome('loss');
                    const wagerAmount = parseInt(wager, 10) || 0;
                    updateExp(-wagerAmount);
                    setTimeout(() => setShowPostScene(true), 1500);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, players.length, isSuccess, isFailed, showPostScene, wager, updateExp]);

    const handleDragEnd = (event) => {
        const { active, delta } = event;
        setBlocks((prev) => {
            const currentBlock = prev.find(b => b.id === active.id);
            if (!currentBlock) return prev;

            let newX = (currentBlock.position?.x || 0) + (delta.x / canvasScale);
            let newY = (currentBlock.position?.y || 0) + (delta.y / canvasScale);

            // Clamp bounds
            const padding = 20;
            const containerW = containerRef.current ? containerRef.current.clientWidth / canvasScale : 2000;
            const containerH = containerRef.current ? containerRef.current.clientHeight / canvasScale : 1500;
            newX = Math.max(padding, Math.min(newX, containerW - 160));
            newY = Math.max(padding, Math.min(newY, containerH - 80));

            const updatedBlock = { ...currentBlock, position: { x: Math.round(newX), y: Math.round(newY) } };
            const newBlocks = [...prev];
            const index = prev.findIndex(b => b.id === active.id);

            // Snapping Logic — matches ArenaBattle (horizontal + vertical)
            const SNAP_THRESHOLD = 50;
            const BLOCK_WIDTH = 140;
            const BLOCK_HEIGHT = 48;
            
            for (const other of prev) {
                if (other.id !== active.id) {
                    const dx = newX - Math.round(other.position?.x || 0);
                    const dy = newY - Math.round(other.position?.y || 0);

                    // Snap RIGHT of other block (horizontal connect)
                    if (Math.abs(dx - BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                        updatedBlock.position = { 
                            x: Math.round(other.position?.x || 0) + BLOCK_WIDTH, 
                            y: Math.round(other.position?.y || 0) 
                        };
                        playClick();
                        break;
                    }
                    // Snap LEFT of other block (horizontal connect)
                    if (Math.abs(dx + BLOCK_WIDTH) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
                        updatedBlock.position = { 
                            x: Math.round(other.position?.x || 0) - BLOCK_WIDTH, 
                            y: Math.round(other.position?.y || 0) 
                        };
                        playClick();
                        break;
                    }
                    // Snap BELOW other block (vertical connect)
                    if (Math.abs(dy - BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                        updatedBlock.position = { 
                            x: Math.round(other.position?.x || 0), 
                            y: Math.round(other.position?.y || 0) + BLOCK_HEIGHT 
                        };
                        playClick();
                        break;
                    }
                    // Snap ABOVE other block (vertical connect)
                    if (Math.abs(dy + BLOCK_HEIGHT) < SNAP_THRESHOLD && Math.abs(dx) < SNAP_THRESHOLD) {
                        updatedBlock.position = { 
                            x: Math.round(other.position?.x || 0), 
                            y: Math.round(other.position?.y || 0) - BLOCK_HEIGHT 
                        };
                        playClick();
                        break;
                    }
                }
            }

            newBlocks[index] = updatedBlock;

            // Broadcast slight progress manually when building the chain
            if (arenaChannelRef.current) {
                try {
                     arenaChannelRef.current.send({
                         type: 'broadcast',
                         event: 'arena-progress',
                         payload: { playerId: user?.id, progress: Math.min(99, Math.random() * 40 + 30) }
                     });
                } catch(e) {}
            }

            return newBlocks;
        });
    };

    const handleSubmit = () => {
        // Logic to check block sequence (simplified for now)
        const sortedBlocks = [...blocks].sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
        const code = sortedBlocks.map(b => b.content).join('\n');

        if (code.includes('x = 5') || true) { // Mocking success
            setIsSuccess(true);
            setPlayers(prev => prev.map(p => p.id === user?.id ? { ...p, progress: 100 } : p));
            setResult({ type: 'success', message: "SYSTEM STABILIZED - RIFT SECURED!" });

            // BROADCAST WIN TO PARTY
            if (arenaChannelRef.current) {
                arenaChannelRef.current.send({
                    type: 'broadcast',
                    event: 'arena-complete',
                    payload: { winnerId: user?.id, winnerName: user?.name || user?.username }
                });
            }

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
        navigate('/play', { replace: true });
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

    // Modifier: compensate for CSS scale on the container so the block follows the cursor during drag
    const customModifier = ({ transform }) => ({
        ...transform,
        x: transform.x / canvasScale,
        y: transform.y / canvasScale
    });

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
                            isMultiplayer={true}
                            numOpponents={Math.max(1, players.length - 1)} // Number of other players
                            outcome={battleOutcome}
                            playerName={user?.username || user?.name || 'Player'}
                            opponentName={players.filter(p => String(p.id) !== String(user?.id)).map(p => p.name || 'Opponent')}
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
                    <header className={`relative z-50 ${theme === 'dark' ? 'bg-[#050810] border-cyan-500/20' : 'bg-white border-slate-300 shadow-sm'} border-b px-4 h-16 flex items-center shrink-0`}>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
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
                                                <span className={`font-galsb text-[8px] tracking-wider uppercase ${isSelf ? (theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700') : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}`}>
                                                    {player.rankName || (isSelf ? 'NOVICE' : 'AGENT')}
                                                </span>
                                                <span className={`font-galsb text-[10px] tracking-widest uppercase truncate max-w-[80px] ${isSelf ? (theme === 'dark' ? 'text-white' : 'text-slate-900') : (theme === 'dark' ? 'text-slate-300' : 'text-slate-500')}`}>
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
                            <button
                                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                                className={`p-2 rounded-full transition-all duration-300 ${
                                    theme === 'dark'
                                        ? 'text-amber-400 hover:bg-amber-400/20 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                                        : 'text-indigo-600 hover:bg-indigo-100 hover:shadow-md'
                                }`}
                                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                            >
                                {theme === 'dark' ? <Sun className="w-6 h-6 animate-spin-slow" /> : <Moon className="w-6 h-6" />}
                            </button>
                            <button
                                onClick={handleWithdrawClick}
                                className={`transition-colors p-2 rounded-full flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </header>

                    <main className={`relative z-10 flex-1 flex h-[calc(100vh-105px)] overflow-hidden ${theme === 'dark' ? 'bg-[#0a0f1c] text-white' : 'bg-[#e2e8f0] text-slate-900'}`}>
                        {/* Left: Coding Area */}
                        <div className={`flex-1 relative overflow-hidden ${theme === 'dark' ? 'bg-[#0c1221]' : 'bg-[#f4f7fc]'}`} ref={containerRef}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.03)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                            <div className="w-full p-6 z-20 relative shrink-0">
                                <div className={`${theme === 'dark' ? 'bg-slate-900/80 backdrop-blur-md border-cyan-500 shadow-lg ring-white/5' : 'bg-white border-cyan-600 shadow-md ring-slate-200'} border-l-4 p-4 max-w-2xl ring-1`}>
                                    <h3 className={`${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-700'} uppercase tracking-widest text-[10px] font-bold mb-1 flex items-center gap-2`}>
                                        <span className={`w-1.5 h-1.5 ${theme === 'dark' ? 'bg-cyan-500' : 'bg-cyan-600'}`} /> DIRECTIVE
                                    </h3>
                                    <p className={`${theme === 'dark' ? 'text-cyan-100' : 'text-slate-700'} text-lg font-medium leading-relaxed font-mono`}>
                                        {puzzle.description}
                                    </p>
                                </div>
                            </div>

                            <DndContext id="grand-arena-dnd" sensors={sensors} onDragEnd={handleDragEnd} modifiers={[customModifier]}>
                                <div className="relative w-full h-full overflow-hidden">
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
                                        {/* Zoom Percentage Indicator */}
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
                                                <PuzzleBlock key={block.id} {...block} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DndContext>
                        </div>

                        {/* Control Console */}
                        <div className={`w-[380px] ${theme === 'dark' ? 'bg-[#080b14] border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]' : 'bg-slate-50 border-slate-300 shadow-[[-10px_0_30px_rgba(0,0,0,0.05)]'} border-l p-6 flex flex-col gap-6 relative z-40`}>
                            {/* Target Output */}
                            <div className="space-y-2">
                                <h3 className={`${theme === 'dark' ? 'text-cyan-600' : 'text-emerald-700'} uppercase tracking-widest text-[10px] font-bold flex items-center gap-2`}>
                                    <Trophy className="w-3 h-3" /> Target Signature
                                </h3>
                                <div className={`${theme === 'dark' ? 'bg-black/60 border-emerald-500/20 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' : 'bg-emerald-100/50 border-emerald-300 text-emerald-700 shadow-inner'} border p-4 font-mono text-lg font-bold relative overflow-hidden`}>
                                    {puzzle.expectedOutput}
                                    <div className={`absolute top-0 left-0 right-0 h-px ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-400/20'} animate-scan-fast`} />
                                </div>
                            </div>

                            {/* Battle Log / Terminal */}
                            <div className={`flex-1 ${theme === 'dark' ? 'bg-black border-white/5 text-slate-500' : 'bg-white border-slate-300 text-slate-600 shadow-inner'} border p-4 font-mono text-xs relative overflow-hidden flex flex-col`}>
                                <div className={`absolute top-0 left-0 px-2 py-0.5 text-[9px] uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>Terminal</div>
                                <div className="mt-4 space-y-1 overflow-auto">
                                    {terminalLogs.map((log, i) => (
                                        <div key={i} className={`text-[11px] ${log.includes('ERROR') ? 'text-red-500' : (theme === 'dark' ? 'opacity-60' : 'text-slate-600')}`}>
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
