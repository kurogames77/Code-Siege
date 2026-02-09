import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameNavbar from '../components/game/GameNavbar';
import { useUser } from '../contexts/UserContext';
import Button from '../components/ui/Button';
import { Info, Trophy, LayoutGrid } from 'lucide-react';
import useSound from '../hooks/useSound';

import towerPageBg from '../assets/towerpagebg.jpg';
import towerFloorBg from '../assets/towerview5.png'; // Abyss background
import buttonDot from '../assets/buttondot.png';

import arrow from '../assets/arrow.png';

const TowerAbyssView = () => {
    // Hardcoded ID for Tower of Abyss
    const id = '5';
    const navigate = useNavigate();
    const { user } = useUser();
    const { playClick, playCancel } = useSound();

    // Mock Tower Data (In a real app, this would come from a store or API)
    // Now enriched with user progress
    const towerData = {
        '1': { name: 'Tower of Eldoria', totalFloors: 30 },
        '2': { name: 'Tower of Tydorin', totalFloors: 30 },
        '3': { name: 'Shadow Keep', totalFloors: 39 },
        '4': { name: 'Tower of Prytody', totalFloors: 30 },
        '5': { name: 'Tower of Abyss', totalFloors: 30 },
        '6': { name: 'Tower of Aeterd', totalFloors: 50 },
    };

    const baseTower = towerData[id] || {
        name: 'Tower of Abyss',
        totalFloors: 30,
    };

    const currentProgress = user.towerProgress?.[id] || 0;

    const tower = {
        id,
        ...baseTower,
        currentProgress
    };

    const currentLevelRef = useRef(null);

    useEffect(() => {
        if (currentLevelRef.current) {
            currentLevelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [id, tower.currentProgress]);

    // 50 Floors
    const floors = Array.from({ length: tower.totalFloors }, (_, i) => i + 1).reverse();

    // Dot positions - Reusing ShadowKeep/Prytody positions for first 30, expanding?
    // User said "same of what u did in the tower of shadow keep". Shadow Keep has 39 floors. Abyss has 50.
    // I need more positions. I will repeat/jitter positions for floors 31-50 or just reuse the pattern.
    // Actually, simple "same of what u did" might mean "copy paste the component logic".
    // I'll keep the 30 positions from Prytody/Shadow list and extend it artificially for 31-50 to avoid crashing, 
    // or just assume the user wants the same VISUAL positions (so maybe I just loop them?).
    // Let's create a 50-item list by extending the existing one with some offsets.

    // Base 30 positions from Prytody/Shadow
    const basePositions = [
        { floor: 1, top: '98%', left: '78%', label: 'LEVEL 3' },
        { floor: 2, top: '100%', left: '51%', label: 'LEVEL 2' },
        { floor: 3, top: '93%', left: '83%', label: 'LEVEL 4' },
        { floor: 4, top: '107%', left: '51%', label: 'LEVEL 1' },
        { floor: 5, top: '94%', left: '51%', label: 'LEVEL 5' },
        { floor: 6, top: '93%', left: '20%', label: 'LEVEL 7' },
        { floor: 7, top: '98%', left: '22%', label: 'LEVEL 6' },
        { floor: 8, top: '89%', left: '51%', label: 'LEVEL 8' },
        { floor: 9, top: '34%', left: '25%', label: 'LEVEL 28' },
        { floor: 10, top: '78%', left: '62%', label: 'LEVEL 11' },
        { floor: 11, top: '78%', left: '39%', label: 'LEVEL 10' },
        { floor: 12, top: '78%', left: '23%', label: 'LEVEL 9' },
        { floor: 13, top: '34%', left: '51%', label: 'LEVEL 29' },
        { floor: 14, top: '78%', left: '77%', label: 'LEVEL 12' },
        { floor: 15, top: '74%', left: '51%', label: 'LEVEL 13' },
        { floor: 16, top: '67%', left: '78%', label: 'LEVEL 14' },
        { floor: 17, top: '67%', left: '63%', label: 'LEVEL 15' },
        { floor: 18, top: '67%', left: '37%', label: 'LEVEL 16' },
        { floor: 19, top: '34%', left: '78%', label: 'LEVEL 27' },
        { floor: 20, top: '56%', left: '78%', label: 'LEVEL 19' },
        { floor: 21, top: '63%', left: '51%', label: 'LEVEL 18' },
        { floor: 22, top: '67%', left: '22%', label: 'LEVEL 17' },
        { floor: 23, top: '45%', left: '25%', label: 'LEVEL 26' },
        { floor: 24, top: '56%', left: '63%', label: 'LEVEL 20' },
        { floor: 25, top: '56%', left: '37%', label: 'LEVEL 21' },
        { floor: 26, top: '56%', left: '22%', label: 'LEVEL 22' },
        { floor: 27, top: '51%', left: '51%', label: 'LEVEL 23' },
        { floor: 28, top: '45%', left: '78%', label: 'LEVEL 24' },
        { floor: 29, top: '45%', left: '51%', label: 'LEVEL 25' },
        { floor: 30, top: '18%', left: '51%', label: 'LEVEL 30' },
    ];

    const dotPositions = basePositions;

    return (
        <div
            className="min-h-screen bg-slate-950 relative"
            style={{
                backgroundImage: `url(${towerPageBg})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
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
                        LEARN HTML LANGUAGE IN THIS TOWER
                    </p>
                </motion.div>

                {/* Vertical Tower Stack */}
                <div className="w-full h-[1500px] relative flex flex-col items-center">
                    {/* Tower Floor Image - Background Layer */}
                    <div className="absolute top-[-200px] bottom-[-150px] left-1/2 -translate-x-1/2 w-[140%] max-w-none z-0 pointer-events-none">
                        <img
                            src={towerFloorBg}
                            alt="Tower of Abyss"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Dots */}
                    <div className="absolute inset-0 z-10">
                        {dotPositions.map((pos, i) => {
                            const labelNum = parseInt(pos.label.replace(/\D/g, '')) || pos.floor;
                            // Ensure we don't render dots beyond available floors
                            if (labelNum > tower.totalFloors) return null;

                            const isCleared = labelNum <= tower.currentProgress;
                            const isCurrent = labelNum === tower.currentProgress + 1;
                            const isVisibleDefault = isCleared || isCurrent;

                            return (
                                <motion.div
                                    key={i}
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
                                        whileHover={isVisibleDefault ? { scale: 1.2, filter: "brightness(1.3)" } : {}}
                                        onClick={() => {
                                            if (isCurrent) {
                                                playClick();
                                                navigate(`/gamecode-abyss/${labelNum}/${id}`);
                                            } else if (!isCleared) {
                                                playCancel();
                                            }
                                        }}
                                        className={`relative flex items-center justify-center ${isCurrent ? 'cursor-pointer' : isCleared ? 'cursor-default' : 'cursor-not-allowed grayscale opacity-50'}`}
                                    >
                                        <img
                                            src={buttonDot}
                                            alt={`Floor ${labelNum}`}
                                            className={`w-[120px] h-[120px] object-contain transition-all duration-300 
                                                ${isCleared ? 'drop-shadow-[0_0_30px_rgba(234,179,8,0.7)] brightness-125' : 'drop-shadow-[0_0_30px_rgba(168,85,247,0.7)]'} 
                                                group-hover:drop-shadow-[0_0_50px_rgba(168,85,247,1)]`}
                                        />

                                        {/* Arrow */}
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

                                        {/* Info Box */}
                                        <div className={`absolute left-1/2 -translate-x-1/2 px-5 py-2 transition-all duration-500 min-w-max pointer-events-none transform z-50
                                            ${isVisibleDefault
                                                ? 'opacity-100 -top-2 scale-100'
                                                : 'opacity-0 -top-0 scale-90 group-hover:opacity-100 group-hover:-top-2 group-hover:scale-110'}`}
                                        >
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-lg border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 animate-bg-pan opacity-50" />
                                                </div>
                                                <div className="absolute -top-[1px] left-2 right-2 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                                                <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-purple-500" />
                                                <div className="relative z-10 flex flex-col items-center leading-none gap-1 px-2 py-1">
                                                    <span className={`text-[13px] font-galsb whitespace-nowrap uppercase tracking-[0.15em] drop-shadow-md font-mono
                                                        ${isCleared
                                                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 filter drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]'
                                                            : 'text-cyan-100'}`}>
                                                        {pos.label}
                                                    </span>
                                                    {isCleared && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className="h-[1px] w-3 bg-yellow-500/50" />
                                                            <span className="text-[9px] font-bold text-yellow-400 tracking-[0.25em] animate-pulse">
                                                                CLEARED
                                                            </span>
                                                            <div className="h-[1px] w-3 bg-yellow-500/50" />
                                                        </div>
                                                    )}
                                                </div>
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
            </main>
        </div>
    );
};

export default TowerAbyssView;
