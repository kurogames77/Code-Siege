import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Filter, Shield, Zap, Sword, Brain, Activity, Target, Flame, Cpu, Swords, ChevronDown, Sparkles } from 'lucide-react';
import heroAsset from '../../assets/hero1a.png'; // Placeholder
import heroAsset2 from '../../assets/hero2view.mp4';
import heroAsset3 from '../../assets/hero1aview.mp4';
import heroAsset4 from '../../assets/hero3view.mp4';
import heroAsset5 from '../../assets/hero4view.mp4';
import hero1aStatic from '../../assets/hero1a.png';
import hero2Static from '../../assets/hero2.png';
import hero3Static from '../../assets/hero3.png';
import hero4Static from '../../assets/hero4.png';
import gameMapBg from '../../assets/gamemapbg.png';
import useSound from '../../hooks/useSound';
import { useTheme } from '../../contexts/ThemeContext'; // Import ThemeContext

// Import Rank Badges
import heroesIcon from '../../assets/heroes.png';
import rank1 from '../../assets/rankbadges/rank1.png';
import rank2 from '../../assets/rankbadges/rank2.png';
import rank3 from '../../assets/rankbadges/rank3.png';
import rank4 from '../../assets/rankbadges/rank4.png';
import rank5 from '../../assets/rankbadges/rank5.png';
import rank6 from '../../assets/rankbadges/rank6.png';
import rank7 from '../../assets/rankbadges/rank7.png';
import rank8 from '../../assets/rankbadges/rank8.png';
import rank9 from '../../assets/rankbadges/rank9.png';
import rank10 from '../../assets/rankbadges/rank10.png';
import rank11 from '../../assets/rankbadges/rank11.png';
import rank12 from '../../assets/rankbadges/rank12.png';

const HeroesModal = ({ isOpen, onClose, userLevel = 24 }) => {
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [detailedHero, setDetailedHero] = useState(null);
    const [selectedId, setSelectedId] = useState(localStorage.getItem('selectedHeroId'));
    const [showOwnedOnly, setShowOwnedOnly] = useState(false);
    const { playCountdownVoice, playClick, playCancel } = useSound();
    const { currentTheme } = useTheme(); // Use ThemeContext

    // Trigger voice-over teaser when looking at hero details
    React.useEffect(() => {
        if (detailedHero) {
            playCountdownVoice(detailedHero.tagline);
        } else {
            window.speechSynthesis.cancel();
        }
    }, [detailedHero, playCountdownVoice]);

    const categories = [
        { id: 'ALL', label: 'All', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'Elemental', label: 'Elemental', icon: <Flame className="w-4 h-4" /> },
        { id: 'Warrior', label: 'Warrior', icon: <Swords className="w-4 h-4" /> },
        { id: 'Martial', label: 'Martial', icon: <Shield className="w-4 h-4" /> },
    ];

    const rankBadges = [rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8, rank9, rank10, rank11, rank12];
    const rankNames = [
        "Warrior", "Elite", "Master", "Grandmaster", "Epic", "Legend",
        "Mythic", "Mythical Glory", "Immortal", "Radiant", "Sovereign", "Code Celestial"
    ];

    const heroes = [
        {
            id: 1,
            name: 'Ignis',
            role: 'Assassin',
            category: 'Elemental',
            rankLevel: 6,
            tagline: "Reality is just data waiting to be compiled into fire.",
            description: 'A living firewall of eternal flame. Ignis compiles raw energy into devastating area-of-effect attacks.',
            stats: { power: 95, speed: 60, defense: 70, utility: 80 },
            abilities: [
                { name: 'Inferno Compile', desc: 'Unleash a massive wave of fire data.', icon: <Flame className="w-4 h-4" /> },
                { name: 'Burn Cycle', desc: 'Damage enemies over time.', icon: <Activity className="w-4 h-4" /> }
            ],
            image: heroAsset4,
            staticImage: hero3Static,
            rarity: 5,
            level: 30,
            reqLevel: 30
        },
        {
            id: 2,
            name: 'Daemon',
            role: 'Tank',
            category: 'Martial',
            rankLevel: 10,
            tagline: "I am the core process. Termination is inevitable.",
            description: 'An unkillable background process. Daemon absorbs damage and redirects it to the system.',
            stats: { power: 70, speed: 50, defense: 100, utility: 85 },
            abilities: [
                { name: 'System Halt', desc: 'Stun all nearby enemies.', icon: <Shield className="w-4 h-4" /> },
                { name: 'Core Dump', desc: 'Heal based on damage taken.', icon: <Brain className="w-4 h-4" /> }
            ],
            image: heroAsset5,
            staticImage: hero4Static,
            rarity: 5,
            level: 25,
            reqLevel: 25
        },
        {
            id: 3,
            name: 'Valerius',
            role: 'Striker',
            category: 'Warrior',
            rankLevel: 1,
            tagline: "Your existence is merely a variable I have set to zero.",
            description: 'A master swordsman who calculates every strike with zero-latency precision.',
            stats: { power: 90, speed: 90, defense: 60, utility: 60 },
            abilities: [
                { name: 'Zero Index', desc: 'Deal fatal damage to low health targets.', icon: <Sword className="w-4 h-4" /> },
                { name: 'Null Pointer', desc: 'Dash and ignore armor.', icon: <Target className="w-4 h-4" /> }
            ],
            image: heroAsset3,
            staticImage: hero1aStatic,
            rarity: 4,
            level: 1,
            reqLevel: 0
        },
        {
            id: 4,
            name: 'Nyx',
            role: 'Mage',
            category: 'Elemental',
            rankLevel: 1,
            tagline: "I’ve already killed you; the loop just hasn't finished closing yet.",
            description: 'A shadow in the code. Nyx executes targets before they register the attack.',
            stats: { power: 100, speed: 100, defense: 40, utility: 70 },
            abilities: [
                { name: 'Infinite Loop', desc: 'Trap an enemy in a time loop.', icon: <Activity className="w-4 h-4" /> },
                { name: 'Fatal Error', desc: 'Execute enemies below 20% HP.', icon: <Zap className="w-4 h-4" /> }
            ],
            image: heroAsset2,
            staticImage: hero2Static,
            rarity: 5,
            level: 1,
            reqLevel: 0
        }
    ];

    const filteredHeroes = heroes.filter(h => {
        const matchCategory = selectedCategory === 'ALL' || h.category === selectedCategory;
        const matchSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchOwned = !showOwnedOnly || userLevel >= h.reqLevel;
        return matchCategory && matchSearch && matchOwned;
    });

    const StatBar = ({ label, value, color }) => (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    className={`h-full ${color} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                />
            </div>
        </div>
    );

    const getRankInfo = (level) => {
        const index = Math.max(0, Math.min(11, level - 1));
        return {
            name: rankNames[index],
            badge: rankBadges[index]
        };
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                staggerChildren: 0.05, // Faster stagger
                delayChildren: 0.1,
                duration: 0.3,
                ease: "easeOut"
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm font-galsb overflow-hidden">

                    {/* Background Visuals - Optimized */}
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        {/* Static gradient instead of multiple layers */}
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-black/80" />
                        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
                            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                        {/* Scanning Bar Effect - Slower Animation */}
                        <motion.div
                            animate={{ top: ['-10%', '110%'] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }} // Slower duration
                            className={`absolute left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-${currentTheme.colors.primary}-500/05 to-transparent z-10`}
                        />
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel} border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative z-10`}
                    >
                        {/* THEME ACCENTS - Static opacity */}
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${currentTheme.colors.primary}-500/30 to-transparent`} />
                        <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${currentTheme.colors.secondary}-500/30 to-transparent`} />

                        <div className="flex-1 flex overflow-hidden">
                            {/* 1. Sidebar (Categories) */}
                            <div className="w-64 bg-slate-950 border-r border-white/5 flex flex-col py-8 relative shrink-0">
                                <div className="px-8 mb-8 relative z-10">
                                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                                        <img src={heroesIcon} alt="" className="w-10 h-10 object-contain" />
                                        <span className="flex items-center">
                                            HERO<span className={`text-${currentTheme.colors.primary}-400`}>ES</span>
                                            <motion.span
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{ duration: 0.8, repeat: Infinity }}
                                                className={`ml-1 w-1.5 h-6 bg-${currentTheme.colors.primary}-500`}
                                            />
                                        </span>
                                    </h2>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2 flex items-center gap-2 ml-14">
                                        <div className={`w-2 h-2 rounded-full bg-${currentTheme.colors.secondary}-500 animate-pulse`} /> CHARACTER SELECTION
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 px-5 relative z-10">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => { playClick(); setSelectedCategory(cat.id); }}
                                            className={`w-full text-left px-5 py-4 rounded-xl transition-all relative overflow-hidden group flex items-center gap-4 ${selectedCategory === cat.id
                                                ? `bg-${currentTheme.colors.primary}-900/20 border-l-4 border-${currentTheme.colors.primary}-500`
                                                : 'text-slate-500 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                                                }`}
                                        >
                                            <div className={`transition-colors duration-300 ${selectedCategory === cat.id ? `text-${currentTheme.colors.primary}-400` : 'text-slate-600 group-hover:text-slate-300'}`}>
                                                {cat.icon}
                                            </div>
                                            <span className={`text-sm font-black tracking-widest uppercase italic ${selectedCategory === cat.id ? 'text-white' : ''}`}>
                                                {cat.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Main Content */}
                            <div className="flex-1 flex flex-col relative bg-black/20">
                                <div className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-slate-900/30 relative z-20">
                                    <div className="flex items-center gap-6">
                                        <button
                                            onClick={() => { playClick(); setShowOwnedOnly(!showOwnedOnly); }}
                                            className={`flex items-center gap-3 px-6 py-3 border transition-all group rounded-xl text-[10px] font-black uppercase tracking-widest ${showOwnedOnly
                                                ? `bg-${currentTheme.colors.primary}-500 text-white border-${currentTheme.colors.primary}-400`
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <Filter className="w-4 h-4" />
                                            <span>OWNED HEROES</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => { playCancel(); onClose(); }}
                                        className="w-12 h-12 flex items-center justify-center bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-180"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar relative">
                                    <motion.div
                                        key={selectedCategory}
                                        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                        initial="hidden"
                                        animate="visible"
                                        variants={{
                                            visible: { transition: { staggerChildren: 0.03 } } // Faster stagger
                                        }}
                                    >
                                        {filteredHeroes.map((hero) => (
                                            <HeroCard
                                                key={hero.id}
                                                hero={hero}
                                                userLevel={userLevel}
                                                rankBadge={getRankInfo(hero.rankLevel).badge}
                                                rankName={getRankInfo(hero.rankLevel).name}
                                                onClick={() => {
                                                    playClick();
                                                    setDetailedHero(hero);
                                                }}
                                            />
                                        ))}
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Detailed Hero View Modal */}
            <AnimatePresence>
                {detailedHero && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-galsb">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-[95vw] h-[90vh] bg-[#02040a] border border-white/10 rounded-[2rem] overflow-hidden flex relative shadow-2xl flex flex-col lg:flex-row z-20 will-change-transform"
                        >
                            <button
                                onClick={() => { playCancel(); setDetailedHero(null); }}
                                className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-rose-500 text-white transition-all duration-500 hover:rotate-180 z-50 rounded-full border border-white/10 shadow-lg backdrop-blur-sm"
                            >
                                <X className="w-8 h-8" />
                            </button>

                            <div className="w-full lg:w-[45%] relative overflow-hidden bg-slate-950">
                                <div className="absolute inset-0">
                                    {typeof detailedHero.image === 'string' && detailedHero.image.endsWith('.mp4') ? (
                                        <video
                                            key={detailedHero.id} // Force re-render on hero change
                                            src={detailedHero.image}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            preload="auto"
                                            className="w-full h-full object-cover transform-gpu will-change-transform"
                                        />
                                    ) : (
                                        <img src={detailedHero.image} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent" />


                            </div>

                            <div className="flex-1 flex flex-col relative overflow-hidden">
                                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                                    <div className="relative">
                                        <h2 className="text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
                                            {detailedHero.name}
                                        </h2>
                                        <div className="flex items-center gap-4 mt-4">
                                            <div className={`px-4 py-1.5 rounded-lg bg-${currentTheme.colors.primary}-900/30 border border-${currentTheme.colors.primary}-500/30 flex items-center gap-3`}>
                                                <div className={`text-${currentTheme.colors.primary}-400`}>
                                                    {detailedHero.category === 'Warrior' && <Swords className="w-4 h-4" />}
                                                    {detailedHero.category === 'Elemental' && <Flame className="w-4 h-4 text-orange-400" />}
                                                    {detailedHero.category === 'Martial' && <Shield className="w-4 h-4 text-rose-500" />}
                                                </div>
                                                <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">{detailedHero.role}</span>
                                            </div>
                                        </div>

                                        <p className={`mt-6 text-slate-400 text-xs leading-relaxed font-bold tracking-wide italic border-l-4 border-${currentTheme.colors.primary}-500/30 pl-4`}>
                                            {detailedHero.description}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <h3 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mb-1">
                                            COMPAT PROTOCOLS
                                        </h3>
                                        {detailedHero.abilities.map((ability, i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                <div className={`w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-${currentTheme.colors.primary}-400 border border-white/5 shrink-0`}>
                                                    {ability.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-black text-white uppercase tracking-widest mb-0.5">{ability.name}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight line-clamp-1">{ability.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-2">
                                        <StatBar label="Power Output" value={detailedHero.stats.power} color={`bg-${currentTheme.colors.primary}-500`} />
                                        <StatBar label="Neural Speed" value={detailedHero.stats.speed} color={`bg-${currentTheme.colors.secondary}-500`} />
                                        <StatBar label="Cyber Armor" value={detailedHero.stats.defense} color="bg-indigo-500" />
                                        <StatBar label="System Logic" value={detailedHero.stats.utility} color="bg-amber-500" />
                                    </div>
                                </div>

                                <div className="p-8 pt-4 bg-gradient-to-t from-black/20 to-transparent">
                                    {selectedId === detailedHero.id.toString() ? (
                                        <div className={`w-full bg-slate-800/40 border border-${currentTheme.colors.primary}-500/20 rounded-xl p-4 flex flex-col items-center justify-center gap-1`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full bg-${currentTheme.colors.primary}-400`} />
                                                <span className="text-sm font-black text-white uppercase tracking-[0.3em]">Currently Used</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const idStr = detailedHero.id.toString();
                                                localStorage.setItem('selectedHeroId', idStr);
                                                setSelectedId(idStr);
                                                const heroImageMap = { 1: 'hero3.png', 2: 'hero4.png', 3: 'hero1a.png', 4: 'hero2.png' };
                                                localStorage.setItem('selectedHeroImage', heroImageMap[detailedHero.id]);
                                                playClick();
                                            }}
                                            disabled={userLevel < detailedHero.reqLevel}
                                            className={`w-full h-16 rounded-xl transition-all relative overflow-hidden group ${userLevel < detailedHero.reqLevel ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                                        >
                                            <div className={`absolute inset-0 bg-${currentTheme.colors.primary}-600 group-hover:bg-${currentTheme.colors.primary}-500 transition-colors`} />
                                            <div className="relative z-10 flex items-center justify-center h-full">
                                                <span className="text-xl font-black text-white uppercase italic tracking-[0.2em]">
                                                    {userLevel < detailedHero.reqLevel ? 'HERO LOCKED' : 'EQUIP HERO'}
                                                </span>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
};

// Memoized Hero Card Component
const HeroCard = React.memo(({ hero, userLevel, rankBadge, rankName, onClick }) => {
    const isLocked = userLevel < hero.reqLevel;

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 300, damping: 25 }
                }
            }}
            whileHover={!isLocked ? { y: -5, zIndex: 10 } : {}}
            onClick={() => !isLocked && onClick()}
            className={`relative aspect-[3/4.2] group perspective-1000 ${isLocked ? 'grayscale-70 opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <div className="absolute inset-0 bg-[#0a0f1a] rounded-[1.5rem] overflow-hidden border border-white/10 group-hover:border-cyan-500/50 transition-all duration-300 shadow-xl">
                <img
                    src={hero.staticImage}
                    loading="lazy"
                    alt={hero.name}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/10 to-transparent opacity-80" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />

                {/* Removed rank badge */}

                <div className="absolute top-4 left-4 w-8 h-8 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-sm z-20">
                    <div className="text-cyan-400">
                        {hero.category === 'Warrior' && <Swords className="w-4 h-4" />}
                        {hero.category === 'Elemental' && <Flame className="w-4 h-4 text-orange-400" />}
                        {hero.category === 'Martial' && <Shield className="w-4 h-4 text-rose-500" />}
                    </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col items-center z-20">
                    <div className="mb-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-sm transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="text-[8px] font-black uppercase text-cyan-400 tracking-[0.3em]">{rankName}</span>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors">
                        {hero.name}
                    </h3>
                    <div className="w-8 h-0.5 bg-cyan-500 mt-2 group-hover:w-16 transition-all duration-300" />
                </div>

                {isLocked && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                        <Shield className="w-10 h-10 text-slate-500 mb-2" />
                        <div className="px-4 py-1.5 bg-slate-900 border border-white/10 rounded-lg">
                            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Lvl {hero.reqLevel}</span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

export default HeroesModal;
