import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext';

const QuestContext = createContext();

export const useQuests = () => {
    const context = useContext(QuestContext);
    if (!context) {
        throw new Error('useQuests must be used within a QuestProvider');
    }
    return context;
};

// Quest Pool Configuration
// Action Types: 'match_complete', 'match_win', 'damage_dealt', 'assist', 'survival_time', 'collect_item', 'heal', 'solve_puzzle', 'use_language', 'login', 'gift', 'defeat_boss', 'spend_gems'
const QUEST_POOL = [
    { id: 'q1', title: '[Warmup] Complete 2 match(es).', target: 2, action: 'match_complete', reward: { exp: 35, gold: 0 } },
    { id: 'q2', title: '[Triumphant Battle] Win 1 match(es).', target: 1, action: 'match_win', reward: { exp: 35, gold: 0 } },
    { id: 'q6', title: '[Duelist] Win a 1v1 Duel.', target: 1, action: 'win_duel', reward: { exp: 45, gold: 0 } },
    { id: 'q7', title: '[Sharpshooter] Deal 5000 damage in a single match.', target: 5000, action: 'damage_dealt', reward: { exp: 40, gold: 0 } },
    // { id: 'q8', title: '[Survivor] Survive for 10 minutes in a match.', target: 10, action: 'survival_time', reward: { exp: 30, gold: 0 } }, 
    // { id: 'q9', title: '[Collector] Collect 10 items.', target: 10, action: 'collect_item', reward: { exp: 25, gold: 0 } },
    // { id: 'q10', title: '[Support] Heal 2000 HP in a single match.', target: 2000, action: 'heal', reward: { exp: 40, gold: 0 } },
    // New Quests
    // { id: 'q11', title: '[Bug Hunter] Solve 3 syntax error challenges.', target: 3, action: 'solve_syntax_error', reward: { exp: 50, gold: 0 } },
    // { id: 'q12', title: '[Optimization] Submit a solution with O(n) complexity.', target: 1, action: 'solve_optimize', reward: { exp: 60, gold: 0 } },
    // { id: 'q13', title: '[Social Butterfly] Send a message in Global Chat.', target: 1, action: 'chat_message', reward: { exp: 10, gold: 0 } },
    // { id: 'q14', title: '[Big Spender] Spend 100 Gems in the Shop.', target: 100, action: 'spend_gems', reward: { exp: 20, gold: 0 } }, // Need to hook into Shop
    // { id: 'q15', title: '[Scholar] Read 2 Hero Guides.', target: 2, action: 'read_guide', reward: { exp: 15, gold: 0 } },
    { id: 'q16', title: '[Speed Coder] Complete a puzzle in under 60 seconds.', target: 1, action: 'speed_solve', reward: { exp: 55, gold: 0 } },
    { id: 'q17', title: '[Polyglot] Submit code in 2 different languages.', target: 2, action: 'submit_language', unique: true, reward: { exp: 40, gold: 0 } },
    // { id: 'q18', title: '[Streak] Login for 3 consecutive days.', target: 3, action: 'login_streak', reward: { exp: 100, gold: 0 } },
    // { id: 'q19', title: '[Helping Hand] Gift a skin to a friend.', target: 1, action: 'gift_skin', reward: { exp: 200, gold: 0 } },
    // { id: 'q20', title: '[Boss Slayer] Defeat a Tower Boss.', target: 1, action: 'defeat_boss', reward: { exp: 80, gold: 0 } }
];

export const QuestProvider = ({ children }) => {
    const { user, updateExp, updateGems } = useUser();
    const [quests, setQuests] = useState([]);
    const [claimedQuests, setClaimedQuests] = useState([]);
    // const [questStats, setQuestStats] = useState({}); // To track 'unique' things if needed

    // Helper: Seeded Random
    const getSeededRandom = (seed) => {
        let currentSeed = seed;
        return () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };
    };

    // 1. Generate / Load Quests on Mount or Date Change
    // 1. Generate / Load Quests on Mount or Date Change
    useEffect(() => {
        if (!user?.id) {
            setQuests([]);
            setClaimedQuests([]);
            return;
        }

        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const storageKey = `daily_quests_v3_${user.id}_${dateStr}`;

        // Try load from storage
        const storedData = localStorage.getItem(storageKey);

        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                setQuests(parsed.quests || []);
                setClaimedQuests(parsed.claimed || []);
            } catch (e) {
                console.error("Failed to parse quest data", e);
                setQuests([]);
            }
        } else {
            // GENERATE NEW QUESTS
            const seed = parseInt(dateStr);
            const random = getSeededRandom(seed);
            const shuffled = [...QUEST_POOL].sort(() => random() - 0.5);

            // Login Task (Auto-complete logic can be handled here or by update)
            const loginTask = {
                id: 'login',
                title: '[Login] Log in to the game.',
                target: 1,
                current: 1, // Auto-complete
                action: 'login',
                reward: { exp: 10, gold: 0 },
                isCompleted: true
            };

            const selected = shuffled.slice(0, 5).map(q => ({
                ...q,
                current: 0,
                isCompleted: false
            }));

            const newQuests = [loginTask, ...selected];
            setQuests(newQuests);
            setClaimedQuests([]);

            // Save initial state
            localStorage.setItem(storageKey, JSON.stringify({
                quests: newQuests,
                claimed: []
            }));
        }
    }, [user?.id]);

    // 2. Update Quest Progress
    const updateQuestProgress = (actionType, amount = 1, metadata = {}) => {
        if (!user?.id || quests.length === 0) return;

        setQuests(prevQuests => {
            let hasChanges = false;
            const updatedQuests = prevQuests.map(quest => {
                if (quest.isCompleted) return quest; // Already done

                // Check action match
                // Specific logic for some actions could go here
                // e.g., 'match_complete_ranked' might check metadata.isRanked

                let isMatch = false;

                if (quest.action === actionType) {
                    isMatch = true;
                }

                // Handling 'invincible' -> Rank match
                if (quest.action === 'match_complete_ranked' && actionType === 'match_complete' && metadata.isRanked) {
                    isMatch = true;
                }

                // Handling 'submit_language' -> Check unique? 
                // For simplicity, we just count up for now, or use metadata to check lang
                // If we want unique languages, we'd need to store state in 'metadata' of the quest itself, but that's complex for MVP.
                // formatting: "current: 0/2" -> simple counter is fine for now.

                if (isMatch) {
                    const newCurrent = Math.min(quest.current + amount, quest.target);
                    if (newCurrent !== quest.current) {
                        hasChanges = true;
                        const isNowCompleted = newCurrent >= quest.target;
                        return {
                            ...quest,
                            current: newCurrent,
                            isCompleted: isNowCompleted
                        };
                    }
                }
                return quest;
            });

            if (hasChanges) {
                // Persist
                const today = new Date();
                const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
                const storageKey = `daily_quests_v3_${user.id}_${dateStr}`;
                localStorage.setItem(storageKey, JSON.stringify({
                    quests: updatedQuests,
                    claimed: claimedQuests
                }));
                return updatedQuests;
            }
            return prevQuests;
        });
    };

    // 3. Claim Quest
    const claimQuest = (questId) => {
        const quest = quests.find(q => q.id === questId);
        if (!quest || !quest.isCompleted || claimedQuests.includes(questId)) return;

        // Add to claimed
        const newClaimed = [...claimedQuests, questId];
        setClaimedQuests(newClaimed);

        // Update Storage
        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const storageKey = `daily_quests_v3_${user.id}_${dateStr}`;
        localStorage.setItem(storageKey, JSON.stringify({
            quests: quests,
            claimed: newClaimed
        }));

        // Grant Rewards
        if (quest.reward.exp > 0) updateExp(quest.reward.exp);
        if (quest.reward.gold > 0) updateGems(quest.reward.gold);

        return quest.reward;
    };

    const value = {
        quests,
        claimedQuests,
        updateQuestProgress,
        claimQuest
    };

    return (
        <QuestContext.Provider value={value}>
            {children}
        </QuestContext.Provider>
    );
};
