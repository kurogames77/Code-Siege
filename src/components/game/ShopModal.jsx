import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Star, Shield, Zap, Gem, CreditCard, Tag, Package, Search, Filter, ShoppingCart, ArrowRight, Palette, Cpu, Flame, Swords, LayoutGrid, Sparkles } from 'lucide-react';
import shopIcon from '../../assets/shop.png';
import gemIcon from '../../assets/gem.png';
import heroAsset from '../../assets/hero1.png'; // Placeholder for hero images
import winterBundle from '../../assets/winter_theme_bundle.png';
import christmasBundle from '../../assets/christmas_theme_bundle.png';
import halloweenBundle from '../../assets/halloween_theme_bundle.png';
import useSound from '../../hooks/useSound';
import TopUpModal from './TopUpModal';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext'; // Import Theme Context

const ShopModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('skins');
    const [searchQuery, setSearchQuery] = useState('');

    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const { playClick, playCancel, playSelect, playSuccess } = useSound();
    const { user } = useUser();
    const { currentTheme, setTheme } = useTheme(); // Use Theme Context

    const items = {

        skins: [
            // No skins available yet for new accounts
        ],
        themes: [
            { id: 13, type: 'theme', name: 'Winter Frost', price: 1500, currency: 'gem', image: winterBundle, rarity: 'epic', description: 'Transform your interface with icy blue hues and frost effects.' },
            { id: 14, type: 'theme', name: 'Santa\'s Workshop', price: 1800, currency: 'gem', image: christmasBundle, rarity: 'legendary', description: 'Festive holiday theme with gifts, ribbons, and cheer.' },
            { id: 15, type: 'theme', name: 'Spooky Hollow', price: 1500, currency: 'gem', image: halloweenBundle, rarity: 'epic', description: 'Dark and eerie theme with pumpkins and spectral glows.' },
        ],
    };

    const categories = [


        { id: 'skins', label: 'Skins', icon: <Package className="w-5 h-5" /> },
        { id: 'themes', label: 'Themes', icon: <Palette className="w-5 h-5" /> },
    ];

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.9 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 25 }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-galsb overflow-hidden">

                    {/* Background Visuals - Matching Theme */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#000000_100%)] opacity-40" />
                        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
                            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

                        {/* Scanning Bar Effect */}
                        <motion.div
                            animate={{ top: ['-10%', '110%'] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            className={`absolute left-0 w-full h-[15%] bg-gradient-to-b from-transparent via-${currentTheme.colors.primary}-500/10 to-transparent pointer-events-none z-10`}
                        />
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className={`w-full max-w-[90vw] h-[85vh] ${currentTheme.colors.panel} border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex relative z-10 backdrop-blur-3xl`}
                    >
                        {/* THEME ACCENTS */}
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${currentTheme.colors.primary}-500/50 to-transparent opacity-50`} />
                        <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${currentTheme.colors.secondary}-500/50 to-transparent opacity-50`} />

                        {/* Scanline Texture Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[100]"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, #fff 3px)' }} />

                        {/* Sidebar */}
                        <div className="w-80 bg-slate-950/60 border-r border-white/5 flex flex-col py-12 relative z-10">
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none opacity-50" />

                            <div className="px-10 mb-12 relative z-10">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="relative">
                                        <div className={`absolute inset-0 bg-${currentTheme.colors.primary}-500/30 blur-xl rounded-full animate-pulse`} />
                                        <img src={shopIcon} alt="Shop" className="w-16 h-16 relative z-10 drop-shadow-2xl object-contain" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none flex items-center">
                                            BLACK <span className={`text-${currentTheme.colors.primary}-500 ml-2`}>MARKET</span>
                                            <motion.span
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{ duration: 0.8, repeat: Infinity }}
                                                className={`ml-1 w-1.5 h-6 bg-${currentTheme.colors.primary}-500`}
                                            />
                                        </h2>
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2 mt-4 ml-1">
                                    <div className={`w-2 h-2 rounded-full bg-${currentTheme.colors.primary}-500 animate-pulse`} /> SECURE TRADING HUB
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 px-6 relative z-10">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            playSelect();
                                            if (user.purchasedThemes?.includes(cat.id) || cat.id === 'default') {
                                                setTheme(cat.id);
                                            }
                                            setActiveTab(cat.id);
                                        }}
                                        className={`w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all relative overflow-hidden group ${activeTab === cat.id
                                            ? `bg-gradient-to-r from-${currentTheme.colors.primary}-600/20 to-transparent border-l-4 border-${currentTheme.colors.primary}-500 shadow-xl`
                                            : 'text-slate-500 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className={`transition-colors duration-300 ${activeTab === cat.id ? `text-${currentTheme.colors.primary}-400 scale-110` : 'text-slate-600 group-hover:text-slate-300'}`}>
                                            {cat.icon}
                                        </div>
                                        <span className={`text-sm font-black tracking-[0.15em] uppercase italic ${activeTab === cat.id ? 'text-white' : ''}`}>
                                            {cat.label}
                                        </span>
                                        {activeTab === cat.id && (
                                            <motion.div
                                                layoutId="activeShopTab"
                                                className={`absolute inset-0 bg-${currentTheme.colors.primary}-400/5 pointer-events-none animate-pulse`}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>


                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col relative bg-black/40 backdrop-blur-sm">
                            {/* Top Bar */}
                            <div className="h-28 px-12 border-b border-white/5 bg-slate-900/20 flex items-center justify-between relative z-20">
                                <div className="flex items-center flex-1">
                                    <div className="relative max-w-lg w-full">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search Black Market inventory..."
                                            className={`w-full bg-black/40 border-2 border-white/5 rounded-2xl py-3.5 pl-14 pr-6 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-${currentTheme.colors.primary}-500/50 focus:bg-black/60 transition-all font-bold tracking-wide`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Balance Display with requested gap and visible styling */}
                                    <div className={`ml-16 flex items-center gap-5 bg-black/50 border-2 border-${currentTheme.colors.primary}-500/40 px-6 py-3 rounded-2xl backdrop-blur-md group hover:border-${currentTheme.colors.primary}-500 transition-all cursor-default shadow-[0_0_30px_rgba(var(--theme-primary-rgb),0.15)] relative overflow-hidden`}>
                                        <div className={`absolute inset-0 bg-gradient-to-r from-${currentTheme.colors.primary}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                        <div className="relative">
                                            <div className={`absolute inset-0 bg-${currentTheme.colors.primary}-500/40 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity`} />
                                            <img src={gemIcon} alt="Gem" className={`w-9 h-9 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.6)]`} />
                                        </div>
                                        <div className="flex flex-col leading-tight min-w-[110px] relative z-10">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] group-hover:text-purple-300 transition-colors">GEMS</span>
                                            <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{(user.gems || 0).toLocaleString()}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                playClick();
                                                setIsTopUpOpen(true);
                                            }}
                                            className={`ml-4 w-11 h-11 rounded-xl bg-${currentTheme.colors.primary}-500 hover:bg-${currentTheme.colors.primary}-400 active:scale-90 transition-all flex items-center justify-center text-white shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.4)] relative z-10`}
                                        >
                                            <PlusIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { playCancel(); onClose(); }}
                                    className="w-12 h-12 flex items-center justify-center bg-slate-800/50 hover:bg-rose-500 border border-white/10 hover:border-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300 hover:rotate-180"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                                <motion.div
                                    key={activeTab}
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-12"
                                >


                                    {/* Items Section */}
                                    <div>
                                        <div className="flex items-center gap-6 mb-10">
                                            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                                                {categories.find(c => c.id === activeTab)?.label}
                                            </h3>
                                            <div className={`h-px bg-gradient-to-r from-${currentTheme.colors.primary}-500/30 to-transparent flex-1`} />
                                        </div>

                                        {(items[activeTab] || []).length === 0 ? (
                                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                                <Package className="w-16 h-16 text-slate-700 mb-4" />
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No items available</p>
                                                <p className="text-slate-600 text-xs mt-2">Check back later for new items!</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                                                {(items[activeTab] || []).map((item) => (
                                                    <motion.div
                                                        key={item.id}
                                                        variants={itemVariants}
                                                        whileHover={{ y: -12, zIndex: 10 }}
                                                        onClick={playClick}
                                                        className={`group relative bg-[#0a0f1a] rounded-[2.5rem] overflow-hidden border transition-all duration-500 shadow-2xl hover:shadow-[0_0_50px_rgba(var(--theme-primary-rgb),0.15)] cursor-pointer perspective-1000 ${item.rarity === 'legendary' ? `border-${currentTheme.colors.secondary}-500/30 hover:border-${currentTheme.colors.secondary}-500` :
                                                            item.rarity === 'epic' ? `border-${currentTheme.colors.primary}-500/30 hover:border-${currentTheme.colors.primary}-500` :
                                                                'border-white/5 hover:border-white/20'
                                                            }`}
                                                    >
                                                        {/* Technical Overlays */}
                                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className={`w-8 h-8 border-t-2 border-r-2 border-${currentTheme.colors.primary}-500/50`} />
                                                        </div>

                                                        {/* Discount Badge */}
                                                        {item.discount && (
                                                            <div className="absolute top-6 left-6 z-20 bg-rose-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-xl animate-pulse">
                                                                -{item.discount}% OFF
                                                            </div>
                                                        )}

                                                        {/* Rarity Tag */}
                                                        <div className="absolute top-6 right-6 z-20">
                                                            <div className={`px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border text-[10px] font-black uppercase tracking-[0.2em] transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ${item.rarity === 'legendary' ? `border-${currentTheme.colors.secondary}-500/50 text-${currentTheme.colors.secondary}-400` :
                                                                item.rarity === 'epic' ? `border-${currentTheme.colors.primary}-500/50 text-${currentTheme.colors.primary}-400` :
                                                                    'border-cyan-500/50 text-cyan-400'
                                                                }`}>
                                                                {item.rarity}
                                                            </div>
                                                        </div>

                                                        {/* Image Container with Dynamic Background */}
                                                        <div className={`h-56 relative overflow-hidden flex items-center justify-center bg-gradient-to-b ${item.rarity === 'legendary' ? 'from-amber-950/20 to-transparent' :
                                                            item.rarity === 'epic' ? 'from-purple-950/20 to-transparent' :
                                                                'from-slate-900/40 to-transparent'
                                                            }`}>
                                                            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(var(--theme-primary-rgb),0.1),_transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                                                            {item.image ? (
                                                                <img
                                                                    src={item.image}
                                                                    alt={item.name}
                                                                    className="h-full w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-2"
                                                                />
                                                            ) : (
                                                                <div className={`w-28 h-28 rounded-full bg-black/40 border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:border-${currentTheme.colors.primary}-500/50 transition-all duration-700 backdrop-blur-md`}>
                                                                    <LayoutGrid className={`w-12 h-12 text-slate-700 group-hover:text-${currentTheme.colors.primary}-500 transition-colors`} />
                                                                </div>
                                                            )}

                                                            {/* Scanning Accent */}
                                                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500 pointer-events-none" />
                                                        </div>

                                                        {/* Content Plate */}
                                                        <div className="p-8 pt-4 flex flex-col items-center text-center">
                                                            <div className="mb-2">
                                                                {item.type === 'hero' && <div className={`text-[9px] font-black text-${currentTheme.colors.primary}-500 uppercase tracking-widest mb-1`}>OPERATIVE MODULE</div>}
                                                                {item.type === 'skin' && <div className={`text-[9px] font-black text-${currentTheme.colors.secondary}-500 uppercase tracking-widest mb-1`}>VISUAL OVERRIDE</div>}
                                                                {item.type === 'theme' && <div className={`text-[9px] font-black text-${currentTheme.colors.accent}-500 uppercase tracking-widest mb-1`}>CORE INTERFACE</div>}
                                                            </div>
                                                            <h4 className={`text-xl font-black text-white uppercase italic tracking-tighter truncate w-full group-hover:text-${currentTheme.colors.primary}-400 transition-colors`}>{item.name}</h4>
                                                            <p className="text-[11px] text-slate-500 mt-2 font-bold tracking-tight line-clamp-2 min-h-[3em] leading-relaxed uppercase">{item.description}</p>

                                                            {/* Price Action Bar */}
                                                            <div className="mt-8 w-full flex items-center gap-4">
                                                                <div className={`flex-1 h-16 bg-black/40 border border-white/5 rounded-2xl flex flex-col justify-center px-6 transition-all group-hover:border-${currentTheme.colors.primary}-500/30 group-hover:bg-black/60`}>
                                                                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Protocol Price</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={gemIcon} alt="Gem" className="w-4 h-4" />
                                                                        <span className="text-lg font-black text-white tabular-nums tracking-tighter">{item.price.toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); playSuccess(); }}
                                                                    className={`h-16 w-16 rounded-2xl transition-all flex items-center justify-center flex-shrink-0 group/cart shadow-xl active:scale-90 ${item.rarity === 'legendary' ? `bg-${currentTheme.colors.secondary}-500 hover:bg-${currentTheme.colors.secondary}-400 text-black shadow-${currentTheme.colors.secondary}-500/20` :
                                                                        `bg-${currentTheme.colors.primary}-600 hover:bg-${currentTheme.colors.primary}-500 text-white shadow-${currentTheme.colors.primary}-600/20`
                                                                        }`}
                                                                >
                                                                    <ShoppingBag className="w-6 h-6 group-hover/cart:scale-110 transition-transform" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Bottom Scan Indicator */}
                                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <TopUpModal
                isOpen={isTopUpOpen}
                onClose={() => setIsTopUpOpen(false)}
            />
        </AnimatePresence>

    );
};

// Helper Icon
const PlusIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="M12 5v14" /></svg>
)

export default ShopModal;
