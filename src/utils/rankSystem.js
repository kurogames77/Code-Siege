import rank1 from '../assets/rankbadges/rank1.png';
import rank2 from '../assets/rankbadges/rank2.png';
import rank3 from '../assets/rankbadges/rank3.png';
import rank4 from '../assets/rankbadges/rank4.png';
import rank5 from '../assets/rankbadges/rank5.png';
import rank6 from '../assets/rankbadges/rank6.png';
import rank7 from '../assets/rankbadges/rank7.png';
import rank8 from '../assets/rankbadges/rank8.png';
import rank9 from '../assets/rankbadges/rank9.png';
import rank10 from '../assets/rankbadges/rank10.png';
import rank11 from '../assets/rankbadges/rank11.png';
import rank12 from '../assets/rankbadges/rank12.png';

export const RANKS = [
    { id: 1, range: '0 - 1,000 EXP', minExp: 0, name: 'SIEGE NOVICE', icon: rank1, color: 'text-slate-500', border: 'border-slate-700/50', bg: 'bg-slate-700/10' },
    { id: 2, range: '1,000+ EXP', minExp: 1000, name: 'CODE INITIATE', icon: rank2, color: 'text-slate-300', border: 'border-slate-500/50', bg: 'bg-slate-500/10' },
    { id: 3, range: '2,500+ EXP', minExp: 2500, name: 'BINARY APPRENTICE', icon: rank3, color: 'text-lime-400', border: 'border-lime-500/50', bg: 'bg-lime-500/10' },
    { id: 4, range: '5,000+ EXP', minExp: 5000, name: 'SYNTAX SOLDIER', icon: rank4, color: 'text-teal-400', border: 'border-teal-500/50', bg: 'bg-teal-500/10' },
    { id: 5, range: '10,000+ EXP', minExp: 10000, name: 'DEBUG KNIGHT', icon: rank5, color: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500/10' },
    { id: 6, range: '20,000+ EXP', minExp: 20000, name: 'SCRIPT MASTER', icon: rank6, color: 'text-indigo-400', border: 'border-indigo-500/50', bg: 'bg-indigo-500/10' },
    { id: 7, range: '40,000+ EXP', minExp: 40000, name: 'CODE WARRIOR', icon: rank7, color: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-500/10' },
    { id: 8, range: '75,000+ EXP', minExp: 75000, name: 'SYSTEM SENTINEL', icon: rank8, color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
    { id: 9, range: '125,000+ EXP', minExp: 125000, name: 'ELITE COMPILER', icon: rank9, color: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'bg-cyan-500/10' },
    { id: 10, range: '200,000+ EXP', minExp: 200000, name: 'GRANDMASTER HACKER', icon: rank10, color: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-500/10' },
    { id: 11, range: '350,000+ EXP', minExp: 350000, name: 'APEX LEGEND', icon: rank11, color: 'text-rose-400', border: 'border-rose-500/50', bg: 'bg-rose-500/10' },
    { id: 12, range: '500,000+ EXP', minExp: 500000, name: 'SIEGE DEITY', icon: rank12, color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/10' },
];

export const getRankFromExp = (exp) => {
    // Find the highest rank where exp >= minExp
    // We reverse the array to find the first match from top down, or use findLast if supported
    // Since we're sorting by minExp ascending, we can iterate backwards
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (exp >= RANKS[i].minExp) {
            return RANKS[i];
        }
    }
    return RANKS[0]; // Fallback
};

export const getNextRank = (exp) => {
    // Find the first rank where minExp > exp
    return RANKS.find(r => r.minExp > exp) || null;
};

export const getRankProgress = (exp) => {
    const currentRank = getRankFromExp(exp);
    const nextRank = getNextRank(exp);

    if (!nextRank) return 100; // Max level

    const currentRankMin = currentRank.minExp;
    const nextRankMin = nextRank.minExp;

    const progress = ((exp - currentRankMin) / (nextRankMin - currentRankMin)) * 100;
    return Math.min(100, Math.max(0, progress));
};

// Helpers for LeaderboardModal.jsx imports
export const getRankName = (exp) => {
    return getRankFromExp(exp).name;
};

export const getRankIcon = (exp) => {
    return getRankFromExp(exp).icon;
};
