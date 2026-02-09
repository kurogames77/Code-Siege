import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronDown, ArrowLeft } from 'lucide-react';

import GameNavbar from '../components/game/GameNavbar';
import LessonModal from '../components/game/LessonModal';
import ChallengeModal from '../components/game/ChallengeModal';
import VictoryModal from '../components/game/VictoryModal';
import DefeatModal from '../components/game/DefeatModal';
import BattleScene from '../components/game/BattleScene';
import { puzzleData, objectives } from '../data/puzzleData';
import { useUser } from '../contexts/UserContext';

import gameCodeBg from '../assets/gamecodebg.jpg';
import postSceneVideo from '../assets/postsceneview.mp4';


const GameCodeAeterd = () => {
    const { floor, towerId } = useParams();
    const navigate = useNavigate();
    const currentFloor = parseInt(floor) || 1;

    // Logic to determine allowed Game Mode
    const getAllowedMode = (f) => {
        if (f <= 10) return 'Interlocking Puzzle';
        if (f <= 20) return 'Puzzle Blocks';
        return 'Text Code';
    };

    const allowedMode = getAllowedMode(currentFloor);

    // State
    const [showLesson, setShowLesson] = useState(false);
    const [showChallenge, setShowChallenge] = useState(false);
    const [showVictory, setShowVictory] = useState(false);
    const [showDefeat, setShowDefeat] = useState(false);
    const [showPostScene, setShowPostScene] = useState(false);
    const [showBattle, setShowBattle] = useState(false);
    const [battleOutcome, setBattleOutcome] = useState('win');
    const [completedRewards, setCompletedRewards] = useState(null);
    const videoRef = React.useRef(null);

    // Configuration State
    const [gameConfig, setGameConfig] = useState({
        gameMode: allowedMode,
        language: 'PHP' // Default for Aeterd
    });

    // Interaction State
    const [openModeDropdown, setOpenModeDropdown] = useState(false);
    const [openLangDropdown, setOpenLangDropdown] = useState(false);

    const currentPuzzle = puzzleData[towerId]?.[floor] || puzzleData['1']['1'];
    // Use puzzle description
    const currentObjectives = currentPuzzle
        ? [currentPuzzle.description]
        : (objectives[floor] || objectives['1']);

    // Constants
    const gameModes = [
        { id: 'interlocking', label: 'Interlocking Puzzle', icon: '🧩' },
        { id: 'blocks', label: 'Puzzle Blocks', icon: '🧱' },
        { id: 'text', label: 'Text Code', icon: '💻' }
    ];

    const languages = [
        'PHP', 'Python (Rec.)', 'C#', 'C++', 'JavaScript', 'HTML'
    ];

    useEffect(() => {
        setGameConfig(prev => ({ ...prev, gameMode: allowedMode }));

        setShowLesson(false);
        setShowChallenge(false);
        setShowVictory(false);
        setShowDefeat(false);
        setShowPostScene(false);
        setShowBattle(false);
        setBattleOutcome('win');
        setCompletedRewards(null);

        const timer = setTimeout(() => {
            setShowLesson(true);
        }, 1000);
        return () => clearTimeout(timer);
    }, [allowedMode, currentFloor]);

    const handleLessonStart = () => {
        setShowLesson(false);
    };

    const handlePlayStart = () => {
        setShowChallenge(true);
    };

    const { updateTowerProgress } = useUser();

    const handleChallengeComplete = (result) => {
        if (result.success) {
            setCompletedRewards(result.rewards);
            updateTowerProgress(towerId, currentFloor);
            setBattleOutcome('win');
            setShowChallenge(false);
            setShowPostScene(true);
        } else {
            setBattleOutcome('loss');
            setShowChallenge(false);
            setShowPostScene(true);
        }
    };

    const handleNextLevel = () => {
        setShowVictory(false);
        setShowPostScene(false);

        if (currentFloor === 30) { // Max for Aeterd
            navigate('/play');
            return;
        }

        const nextFloor = currentFloor + 1;
        navigate(`/gamecode-aeterd/${nextFloor}/${towerId}`);
    };

    const handleReplay = () => {
        setShowVictory(false);
        setShowDefeat(false);
        setShowPostScene(false);
        setShowChallenge(true);
    };

    const setGameMode = (label) => {
        if (label === allowedMode) {
            setGameConfig(prev => ({ ...prev, gameMode: label }));
        }
    };

    const setLanguage = (label) => {
        if (label === 'PHP') {
            setGameConfig(prev => ({ ...prev, language: label }));
        }
    };

    const isDashboardActive = !showLesson && !showChallenge;

    return (
        <div
            className="min-h-screen bg-slate-950 relative overflow-hidden font-inter"
            style={{
                backgroundImage: `url(${gameCodeBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {!showPostScene && <GameNavbar />}

            {/* Back to Tower Button */}
            {!showPostScene && (
                <div className="fixed top-0 left-0 right-0 h-48 z-40 pointer-events-none">
                    <div className="absolute top-28 left-8 pointer-events-auto">
                        <button
                            onClick={() => navigate(`/tower-aeterd`)}
                            className="glass-panel px-4 py-1.5 flex items-center gap-2 text-[15px] font-black text-white hover:text-primary transition-all hover:scale-105 border-white/30"
                        >
                            <ArrowLeft className="w-9 h-9" />
                            BACK TO TOWER OF AETERD
                        </button>
                    </div>
                </div>
            )}

            {/* Overlay Mesh / Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-0" />

            {showPostScene ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
                >
                    <video
                        key={currentFloor}
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

                    {showBattle && (
                        <BattleScene
                            key={currentFloor}
                            level={currentFloor}
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
                </motion.div>
            ) : (
                <main className="relative z-10 w-full h-screen flex flex-col items-center justify-center px-4 pb-32">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full max-w-6xl flex flex-col items-center gap-8 relative z-30"
                    >
                        <div className="text-center space-y-4">
                            <h1 className="text-7xl md:text-8xl font-black text-white italic uppercase tracking-[-0.05em] drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] font-galsb">
                                CODEX ARENA
                            </h1>
                            <p className="text-purple-400 text-2xl tracking-[0.4em] uppercase font-bold opacity-80">
                                TOWER {towerId} • LEVEL {floor}
                            </p>
                        </div>

                        {isDashboardActive && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full flex flex-col md:flex-row justify-center items-center gap-6 mt-4 relative z-40"
                            >
                                <div className="relative">
                                    <div className="w-56">
                                        <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1 text-center">Game Mode</label>
                                        <div
                                            onClick={() => setOpenModeDropdown(!openModeDropdown)}
                                            className="bg-[#111623]/90 hover:bg-[#1A2030] border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all shadow-lg text-white group backdrop-blur-md"
                                        >
                                            <span className="font-bold text-xs truncate">{gameConfig.gameMode}</span>
                                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openModeDropdown ? 'rotate-180' : ''}`} />
                                        </div>

                                        <AnimatePresence>
                                            {openModeDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full right-0 mt-2 w-64 bg-[#111623] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl"
                                                >
                                                    {gameModes.map((mode) => {
                                                        const isDisabled = mode.label !== allowedMode;
                                                        return (
                                                            <div
                                                                key={mode.id}
                                                                onClick={() => !isDisabled && setGameMode(mode.label) && setOpenModeDropdown(false)}
                                                                className={`p-3 px-4 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0
                                                                 ${isDisabled ? 'opacity-40 cursor-not-allowed bg-black/20' : 'hover:bg-white/5 cursor-pointer'} 
                                                                 ${gameConfig.gameMode === mode.label ? 'bg-purple-500/10 text-purple-400' : 'text-slate-300'}`}
                                                            >
                                                                <span className="text-lg">{mode.icon}</span>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-xs">{mode.label}</span>
                                                                    {isDisabled && <span className="text-[9px] uppercase text-red-400 font-bold tracking-wider">Locked</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="flex justify-center mx-2">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handlePlayStart}
                                        className="w-24 h-24 bg-[#A855F7] hover:bg-[#9333EA] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.6)] border-4 border-[#111623] ring-4 ring-purple-500/30 z-10 transition-all"
                                    >
                                        <Play className="w-10 h-10 text-white fill-current ml-1" />
                                    </motion.button>
                                </div>

                                <div className="relative">
                                    <div className="w-56">
                                        <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1 text-center">Language</label>
                                        <div
                                            onClick={() => setOpenLangDropdown(!openLangDropdown)}
                                            className="bg-[#111623]/90 hover:bg-[#1A2030] border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all shadow-lg text-yellow-400 group backdrop-blur-md"
                                        >
                                            <span className="font-bold text-xs">{gameConfig.language}</span>
                                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLangDropdown ? 'rotate-180' : ''}`} />
                                        </div>

                                        <AnimatePresence>
                                            {openLangDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full left-0 mt-2 w-64 bg-[#111623] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-64 overflow-y-auto"
                                                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                                                >
                                                    {languages.map((lang) => {
                                                        const isDisabled = lang !== 'PHP';
                                                        return (
                                                            <div
                                                                key={lang}
                                                                onClick={() => !isDisabled && setLanguage(lang) && setOpenLangDropdown(false)}
                                                                className={`p-3 px-4 font-bold text-left transition-colors border-b border-white/5 last:border-0
                                                                 ${isDisabled ? 'opacity-40 cursor-not-allowed bg-black/20' : 'hover:bg-white/5 cursor-pointer'}
                                                                 ${gameConfig.language === lang ? 'bg-yellow-500/10 text-yellow-400' : 'text-slate-300'}`}
                                                            >
                                                                {lang}
                                                                {isDisabled && <span className="float-right text-[9px] uppercase text-red-500 mt-1">Locked</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </main>
            )}

            <LessonModal
                key={currentFloor}
                isOpen={showLesson && !showPostScene}
                onStart={handleLessonStart}
                objectives={currentObjectives}
            />

            <ChallengeModal
                isOpen={showChallenge}
                onClose={() => setShowChallenge(false)}
                puzzle={currentPuzzle}
                config={gameConfig}
                onComplete={handleChallengeComplete}
                level={parseInt(floor) || 1}
            />

            <VictoryModal
                isOpen={showVictory}
                rewards={completedRewards}
                onNextLevel={handleNextLevel}
                onReplay={handleReplay}
                isLastLevel={currentFloor === 50} // Max for Aeterd
            />

            <DefeatModal
                isOpen={showDefeat}
                onRetry={handleReplay}
            />
        </div>
    );
};

export default GameCodeAeterd;
