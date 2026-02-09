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


const GameCodeTydorin = () => {
    const { floor, towerId } = useParams();
    const navigate = useNavigate();
    const currentFloor = parseInt(floor) || 1;

    // Logic to determine allowed Game Mode based on floor
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
    const [battleOutcome, setBattleOutcome] = useState('win'); // 'win' | 'loss'
    const [completedRewards, setCompletedRewards] = useState(null);
    const videoRef = React.useRef(null);

    // Configuration State
    const [gameConfig, setGameConfig] = useState({
        gameMode: allowedMode,
        language: 'Python (Rec.)'
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
        'Python (Rec.)', 'C#', 'C++', 'JavaScript', 'HTML', 'PHP'
    ];

    useEffect(() => {
        // Enforce allowed mode on mount/change
        setGameConfig(prev => ({ ...prev, gameMode: allowedMode }));

        // Reset Level State
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
            // Failure / Time Out
            setBattleOutcome('loss');
            setShowChallenge(false);
            setShowPostScene(true);
        }
    };

    const handleNextLevel = () => {
        setShowVictory(false);
        setShowPostScene(false);

        if (currentFloor === 30) {
            navigate('/play');
            return;
        }

        // Navigate to next floor
        const nextFloor = currentFloor + 1;
        // Simple navigation assumption, ideally check max floors
        navigate(`/gamecode-tydorin/${nextFloor}/${towerId}`);
    };

    const handleReplay = () => {
        setShowVictory(false);
        setShowDefeat(false);
        setShowPostScene(false);
        setShowChallenge(true);
    };

    const setGameMode = (label) => {
        // Strict check although UI disables it
        if (label === allowedMode) {
            setGameConfig(prev => ({ ...prev, gameMode: label }));
        }
    };

    const setLanguage = (label) => {
        if (label === 'Python (Rec.)') {
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
                            onClick={() => navigate(`/tower-tydorin`)}
                            className="glass-panel px-4 py-1.5 flex items-center gap-2 text-[15px] font-black text-white hover:text-primary transition-all hover:scale-105 border-white/30"
                        >
                            <ArrowLeft className="w-9 h-9" />
                            BACK TO TOWER TYDORIN
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
                            // Video ends naturally after resume -> Show Victory
                            setShowVictory(true);
                        }}
                    />

                    {/* Battle Scene Overlay */}
                    {showBattle && (
                        <BattleScene
                            key={currentFloor}
                            level={currentFloor}
                            outcome={battleOutcome}
                            onVideoResume={() => {
                                // Resume video playback after enemy defeat (WIN case)
                                if (videoRef.current) {
                                    videoRef.current.play();
                                }
                            }}
                            onBattleEnd={() => {
                                // Called when battle ends (LOSS case)
                                setShowBattle(false);
                                setShowDefeat(true);
                            }}
                        />
                    )}
                </motion.div>
            ) : (
                <main className="relative z-10 w-full h-screen flex flex-col items-center justify-center px-4 pb-32">

                    {/* Character on Left - Reduced Size */}


                    {/* Main Dashboard Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full max-w-6xl flex flex-col items-center gap-8 relative z-30"
                    >
                        {/* Header Text */}
                        <div className="text-center space-y-4">
                            <h1 className="text-7xl md:text-8xl font-black text-white italic uppercase tracking-[-0.05em] drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] font-galsb">
                                CODEX ARENA
                            </h1>
                            <p className="text-purple-400 text-2xl tracking-[0.4em] uppercase font-bold opacity-80">
                                TOWER {towerId} • LEVEL {floor}
                            </p>
                        </div>

                        {/* Interaction Zone */}
                        {isDashboardActive && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full flex flex-col md:flex-row justify-center items-center gap-6 mt-4 relative z-40"
                            >
                                {/* Left: Game Mode Display */}
                                <div className="relative">
                                    <div className="w-56">
                                        <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1 text-center">Game Mode</label>
                                        <div className="bg-[#111623]/90 border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-center transition-all shadow-lg text-white group backdrop-blur-md">
                                            <span className="font-bold text-xs truncate">{gameConfig.gameMode}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Play Button */}
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

                                {/* Right: Language Display */}
                                <div className="relative">
                                    <div className="w-56">
                                        <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1 text-center">Language</label>
                                        <div className="bg-[#111623]/90 border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-center transition-all shadow-lg text-yellow-400 group backdrop-blur-md">
                                            <span className="font-bold text-xs">{gameConfig.language}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </motion.div>
                </main>
            )}

            {/* Modals */}
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
                isLastLevel={currentFloor === 30}
            />

            <DefeatModal
                isOpen={showDefeat}
                onRetry={handleReplay}
            />
        </div>
    );
};

export default GameCodeTydorin;
