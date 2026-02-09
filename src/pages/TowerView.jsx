import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameNavbar from '../components/game/GameNavbar';
import { useUser } from '../contexts/UserContext';
import Button from '../components/ui/Button';
import { Info, Trophy, LayoutGrid } from 'lucide-react';
import useSound from '../hooks/useSound';
import { coursesAPI } from '../services/api';

import towerPageBg from '../assets/towerpagebg.jpg';
import towerFloorBg from '../assets/towerfloor111.png';
import buttonDot from '../assets/buttondot.png';

import arrow from '../assets/arrow.png';

const TowerView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const { playClick, playCancel } = useSound();


    const [dynamicLevels, setDynamicLevels] = useState([]);
    const [loadingLevels, setLoadingLevels] = useState(false);
    const [difficultySettings, setDifficultySettings] = useState({
        mode: 'Beginner',
        difficulty: 'Easy'
    });

    // Tower Data
    const towerData = {
        '1': { name: 'Tower of Eldoria', totalFloors: dynamicLevels.length > 0 ? dynamicLevels.length : 30, courseId: 'py' },
        '2': { name: 'Tower of Tydorin', totalFloors: 30 },
        '3': { name: 'Shadow Keep', totalFloors: 39 },
        '4': { name: 'Tower of Prytody', totalFloors: 30 },
        '5': { name: 'Tower of Abyss', totalFloors: 50 },
        '6': { name: 'Tower of Aeterd', totalFloors: 50 },
    };

    const baseTower = towerData[id] || {
        name: 'Citadel of Logic',
        totalFloors: 20,
    };

    // Fetch dynamic levels from DB for Tower 1 (Python)
    useEffect(() => {
        const fetchLevels = async () => {
            if (id === '1') { // Only for Python Tower
                try {
                    setLoadingLevels(true);

                    // 1. Get all courses to find the Python ID
                    const courses = await coursesAPI.getCourses();
                    const pythonCourse = courses.find(c => c.name.toLowerCase().includes('python'));

                    if (pythonCourse) {
                        // 2. Fetch ALL levels (no filter)
                        const levels = await coursesAPI.getLevels(
                            pythonCourse.id,
                            null, // mode
                            null  // difficulty
                        );
                        setDynamicLevels(levels || []);
                    }
                } catch (error) {
                    console.error('Failed to fetch tower levels:', error);
                } finally {
                    setLoadingLevels(false);
                }
            }
        };
        fetchLevels();
    }, [id]);

    const currentProgress = user?.towerProgress?.[id] || 0;

    const tower = {
        id,
        ...baseTower,
        // Override totalFloors if dynamic levels found
        totalFloors: dynamicLevels.length > 0 ? dynamicLevels.length : baseTower.totalFloors,
        currentProgress
    };

    const currentLevelRef = useRef(null);

    useEffect(() => {
        if (currentLevelRef.current) {
            currentLevelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [id, tower.currentProgress]);

    const floors = Array.from({ length: tower.totalFloors }, (_, i) => i + 1).reverse();


    const dotPositions = [
        { floor: 1, top: '109%', left: '51%', label: 'LEVEL 3' },
        { floor: 2, top: '109%', left: '33%', label: 'LEVEL 2' },
        { floor: 3, top: '103%', left: '51%', label: 'LEVEL 4' },
        { floor: 4, top: '107%', left: '14%', label: 'LEVEL 1' },
        { floor: 5, top: '96%', left: '51%', label: 'LEVEL 5' },
        { floor: 6, top: '90%', left: '51%', label: 'LEVEL 7' },
        { floor: 7, top: '89%', left: '67%', label: 'LEVEL 6' },
        { floor: 8, top: '89%', left: '35%', label: 'LEVEL 8' },
        { floor: 9, top: '25%', left: '83%', label: 'LEVEL 28' },
        { floor: 10, top: '78%', left: '66%', label: 'LEVEL 11' },
        { floor: 11, top: '78%', left: '35%', label: 'LEVEL 10' }, //
        { floor: 12, top: '83%', left: '16%', label: 'LEVEL 9' },
        { floor: 13, top: '25%', left: '19%', label: 'LEVEL 29' },
        { floor: 14, top: '72%', left: '87%', label: 'LEVEL 12' },
        { floor: 15, top: '67%', left: '66%', label: 'LEVEL 13' },
        { floor: 16, top: '67%', left: '51%', label: 'LEVEL 14' },
        { floor: 17, top: '67%', left: '34%', label: 'LEVEL 15' },
        { floor: 18, top: '60%', left: '15%', label: 'LEVEL 16' },
        { floor: 19, top: '29%', left: '87%', label: 'LEVEL 27' },
        { floor: 20, top: '56%', left: '66%', label: 'LEVEL 19' },
        { floor: 21, top: '56%', left: '51%', label: 'LEVEL 18' },
        { floor: 22, top: '56%', left: '34%', label: 'LEVEL 17' },
        { floor: 23, top: '35%', left: '70%', label: 'LEVEL 26' },
        { floor: 24, top: '50%', left: '87%', label: 'LEVEL 20' },
        { floor: 25, top: '45%', left: '67%', label: 'LEVEL 21' },
        { floor: 26, top: '45%', left: '51%', label: 'LEVEL 22' },
        { floor: 27, top: '45%', left: '34%', label: 'LEVEL 23' },
        { floor: 28, top: '39%', left: '15%', label: 'LEVEL 24' },
        { floor: 29, top: '35%', left: '32%', label: 'LEVEL 25' },
        { floor: 30, top: '25%', left: '50%', label: 'LEVEL 30' },
    ];

    return (
        <div
            className="min-h-screen bg-slate-950 relative"
            style={
                id === '1' ? {
                    backgroundImage: `url(${towerPageBg})`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {}
            }
        >
            <GameNavbar />

            {/* Floating HUD */}
            <div className="fixed top-0 left-0 right-0 h-48 z-40 pointer-events-none">
                <div className="absolute top-28 left-8 pointer-events-auto">
                    <button
                        onClick={() => {
                            playClick();
                            navigate('/play');
                        }}
                        className="glass-panel px-4 py-1.5 flex items-center gap-2 text-[15px] font-galsb text-white hover:text-primary transition-all hover:scale-105 border-white/30"
                    >
                        <LayoutGrid className="w-9 h-9" />
                        BACK TO MAP
                    </button>
                </div>

                {/* Centered Progress Box */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
                    <div className="glass-panel px-6 py-2 flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-accent" />
                        <span className="text-white font-galsb text-sm uppercase tracking-tighter">
                            {tower.currentProgress} / {tower.totalFloors} CLEARED
                        </span>
                    </div>



                    <button
                        onClick={() => playClick()}
                        className="glass-panel p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <main className="pt-48 pb-40 px-6 max-w-4xl mx-auto flex flex-col items-center">
                {/* Tower Top Decor */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center mb-24 space-y-8 relative z-30"
                >
                    <h1 className="text-4xl md:text-6xl font-normal text-white italic uppercase tracking-[0.3em] font-galsb drop-shadow-[0_0_20px_rgba(168,85,247,0.8)] filter whitespace-nowrap">
                        {tower.name}
                    </h1>
                    <div className="h-1.5 w-48 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto rounded-full" />
                    <p className="text-white font-normal uppercase text-2xl tracking-[0.2em] font-galsb drop-shadow-md">
                        LEARN PYTHON LANGUAGE IN THIS TOWER
                    </p>
                </motion.div>

                {/* Vertical Tower Stack */}
                <div className="w-full h-[1500px] relative flex flex-col items-center">
                    {/* Tower Floor 1 Image - Background Layer */}
                    <div className="absolute top-[-200px] bottom-[-150px] left-1/2 -translate-x-1/2 w-[140%] max-w-none z-0 pointer-events-none">
                        <img
                            src={towerFloorBg}
                            alt="Tower Floor 1"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Character Visibility - Static Hero beside Floor 4 dot */}


                    {/* 29 Dots - Individually Positioned */}
                    <div className="absolute inset-0 z-10">
                        {dotPositions.map((pos, i) => {
                            // Extract floor number from label (e.g., "FLOOR 3" -> 3)
                            const labelNum = parseInt(pos.label.replace(/\D/g, '')) || 0;
                            // Check against actual user progress
                            const isCleared = labelNum <= tower.currentProgress;
                            const isCurrent = labelNum === tower.currentProgress + 1;
                            const isVisibleDefault = isCleared || isCurrent;

                            return (
                                <motion.div
                                    key={pos.floor}
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: i * 0.05
                                    }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 group"
                                    style={{ top: pos.top, left: pos.left }}
                                    ref={isCurrent ? currentLevelRef : null}
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.2, filter: "brightness(1.3)" }}
                                        onClick={() => {
                                            if (isVisibleDefault) {
                                                playClick();
                                                const query = id === '1' ? `?mode=${difficultySettings.mode}&difficulty=${difficultySettings.difficulty}` : '';
                                                navigate(`/gamecode/${labelNum}/${id}${query}`);
                                            }
                                        }}
                                        className={`relative flex items-center justify-center cursor-pointer ${!isVisibleDefault ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                                    >
                                        <img
                                            src={buttonDot}
                                            alt={`Floor ${pos.floor}`}
                                            className={`w-[120px] h-[120px] object-contain transition-all duration-300 
                                                ${isCleared ? 'drop-shadow-[0_0_30px_rgba(234,179,8,0.7)] brightness-125' : 'drop-shadow-[0_0_30px_rgba(168,85,247,0.7)]'} 
                                                group-hover:drop-shadow-[0_0_50px_rgba(168,85,247,1)]`}
                                        />

                                        {/* Arrow Indicator - Massive Overlay */}
                                        <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 pointer-events-none transform
                                            ${isCurrent
                                                ? 'opacity-100 -top-20 left-0 scale-300'
                                                : 'opacity-0 -top-24 left-0 scale-90'}`}
                                        >
                                            <motion.img
                                                src={arrow}
                                                alt="Point down"
                                                animate={{ y: [0, 10, 0] }}
                                                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                                                className="w-14 h-14 object-contain filter drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]"
                                            />
                                        </div>

                                        {/* Info Box - Magical Reveal & Persistence */}
                                        {/* Info Box - Enhanced Tech Design */}
                                        <div className={`absolute left-1/2 -translate-x-1/2 px-5 py-2 transition-all duration-500 min-w-max pointer-events-none transform z-50
                                            ${isVisibleDefault
                                                ? 'opacity-100 -top-2 scale-100'
                                                : 'opacity-0 -top-0 scale-90 group-hover:opacity-100 group-hover:-top-2 group-hover:scale-110'}`}
                                        >
                                            <div className="relative">
                                                {/* Cyberpunk Container bg */}
                                                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-lg border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                                    {/* Animated Gradient Border */}
                                                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 animate-bg-pan opacity-50" />
                                                </div>

                                                {/* Tech Decoration Lines */}
                                                <div className="absolute -top-[1px] left-2 right-2 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                                                <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-purple-500" />

                                                {/* Content */}
                                                <div className="relative z-10 flex flex-col items-center leading-none gap-1 px-2 py-1">
                                                    <span className={`text-[13px] font-black whitespace-nowrap uppercase tracking-[0.15em] drop-shadow-md font-mono
                                                        ${isCleared
                                                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 filter drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]'
                                                            : 'text-cyan-100'}`}>
                                                        {pos.label}
                                                    </span>

                                                    {isCleared && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className="h-[1px] w-3 bg-yellow-500/50" />
                                                            <span className="text-[9px] font-galsb text-yellow-400 tracking-[0.25em] animate-pulse">
                                                                CLEARED
                                                            </span>
                                                            <div className="h-[1px] w-3 bg-yellow-500/50" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Corner Accents */}
                                                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/50 rounded-tl-sm" />
                                                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/50 rounded-tr-sm" />
                                                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/50 rounded-bl-sm" />
                                                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/50 rounded-br-sm" />
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Tower Base Footing Removed */}
            </main>

        </div>
    );
};

export default TowerView;
