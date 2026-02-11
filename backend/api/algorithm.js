import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the Python algorithm scripts
const IRT_ALGO_PATH = path.resolve(__dirname, '../../Algorithms/IRT_Algo.py');
const DDA_ALGO_PATH = path.resolve(__dirname, '../../Algorithms/DDA_Algo.py');
const KMEANS_ALGO_PATH = path.resolve(__dirname, '../../Algorithms/KMeans_Cluster.py');

/**
 * Helper function to execute Python script
 * @param {string} scriptPath - Path to the Python script
 * @param {object} inputData - JSON data to pass to the script
 * @returns {Promise<object>} - Parsed JSON result from Python
 */
const runPythonScript = (scriptPath, inputData) => {
    return new Promise((resolve, reject) => {
        const jsonInput = JSON.stringify(inputData);

        // Spawn Python process
        const pythonProcess = spawn('python', [scriptPath, jsonInput]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Python stderr:', stderr);
                reject(new Error(`Python process exited with code ${code}: ${stderr}`));
                return;
            }

            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (parseError) {
                reject(new Error(`Failed to parse Python output: ${stdout}`));
            }
        });

        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to start Python process: ${err.message}`));
        });
    });
};

/**
 * POST /api/algorithm/analyze
 * Analyze student performance to determine if they are struggling (IRT)
 * 
 * Body: {
 *   userId: string,
 *   time: number (seconds consumed during puzzle),
 *   errors: number (execution errors made),
 *   hints: number (hints used)
 * }
 */
router.post('/analyze', authenticateUser, async (req, res) => {
    try {
        const { userId, time, errors, hints } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const inputData = {
            userId: userId,
            time: parseFloat(time) || 0,
            errors: parseInt(errors) || 0,
            hints: parseInt(hints) || 0
        };

        console.log('[IRT Algorithm] Analyzing:', inputData);

        const result = await runPythonScript(IRT_ALGO_PATH, inputData);

        console.log('[IRT Algorithm] Result:', result);

        res.json(result);
    } catch (error) {
        console.error('[IRT Algorithm] Error:', error);
        res.status(500).json({
            error: 'Failed to analyze performance',
            details: error.message
        });
    }
});

/**
 * POST /api/algorithm/adjust-difficulty
 * Adjust difficulty based on IRT status (DDA)
 * 
 * Body: {
 *   irtStatus: string ('NotStruggling' | 'MediumStruggling' | 'SuperStruggling'),
 *   currentDifficulty: string ('Easy' | 'Medium' | 'Hard')
 * }
 */
router.post('/adjust-difficulty', authenticateUser, async (req, res) => {
    try {
        const { irtStatus, currentDifficulty } = req.body;

        // Validation
        if (!irtStatus) {
            return res.status(400).json({ error: 'irtStatus is required' });
        }
        if (!currentDifficulty) {
            return res.status(400).json({ error: 'currentDifficulty is required' });
        }

        const inputData = {
            irtStatus: irtStatus,
            currentDifficulty: currentDifficulty
        };

        console.log('[DDA Algorithm] Adjusting:', inputData);

        const result = await runPythonScript(DDA_ALGO_PATH, inputData);

        console.log('[DDA Algorithm] Result:', result);

        res.json(result);
    } catch (error) {
        console.error('[DDA Algorithm] Error:', error);
        res.status(500).json({
            error: 'Failed to adjust difficulty',
            details: error.message
        });
    }
});

/**
 * POST /api/algorithm/full-analysis
 * Combined endpoint: Runs IRT analysis, then DDA adjustment
 * 
 * Body: {
 *   userId: string,
 *   time: number,
 *   errors: number,
 *   hints: number,
 *   currentDifficulty: string ('Easy' | 'Medium' | 'Hard')
 * }
 */
router.post('/full-analysis', authenticateUser, async (req, res) => {
    try {
        const { userId, time, errors, hints, currentDifficulty } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        if (!currentDifficulty) {
            return res.status(400).json({ error: 'currentDifficulty is required' });
        }

        // Step 1: Run IRT Analysis
        const irtInput = {
            userId: userId,
            time: parseFloat(time) || 0,
            errors: parseInt(errors) || 0,
            hints: parseInt(hints) || 0
        };

        console.log('[Full Analysis] Step 1 - IRT:', irtInput);
        const irtResult = await runPythonScript(IRT_ALGO_PATH, irtInput);

        // --- NEW: Fetch Recent History for Streak Logic ---
        // Get last 5 completed levels to determine trend
        const { data: recentProgress } = await supabase
            .from('user_progress')
            .select('score, completed, floor')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        let performanceTrend = 'stable'; // 'stable', 'struggling', 'excelling'

        if (recentProgress && recentProgress.length >= 3) {
            // Count recent "failures" (low score or incomplete) vs successes
            // Assuming score < 50 is a struggle, score > 80 is excelling
            const struggles = recentProgress.filter(p => p.score < 50).length;
            const excellences = recentProgress.filter(p => p.score > 80).length;

            if (struggles >= 3) performanceTrend = 'struggling';
            else if (excellences >= 3) performanceTrend = 'excelling';
        }

        console.log(`[Full Analysis] Recent Trend (Last ${recentProgress?.length || 0}): ${performanceTrend}`);

        // Step 2: Run DDA Adjustment using IRT result + Trend
        const ddaInput = {
            irtStatus: irtResult.status,
            currentDifficulty: currentDifficulty,
            metrics: {
                time: parseFloat(time) || 0,
                errors: parseInt(errors) || 0,
                hints: parseInt(hints) || 0
            },
            history: {
                trend: performanceTrend,
                recentCount: recentProgress?.length || 0
            }
        };

        console.log('[Full Analysis] Step 2 - DDA:', ddaInput);
        const ddaResult = await runPythonScript(DDA_ALGO_PATH, ddaInput);

        // Combine results
        const combinedResult = {
            irt: irtResult,
            dda: ddaResult,
            summary: {
                studentStatus: irtResult.status,
                recentTrend: performanceTrend,
                previousDifficulty: currentDifficulty,
                newDifficulty: ddaResult.new_difficulty,
                difficultyChanged: ddaResult.difficulty_changed
            }
        };

        // Step 3: Update User Profile with new difficulty
        if (ddaResult.new_difficulty) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ current_difficulty: ddaResult.new_difficulty })
                .eq('id', userId);

            if (updateError) {
                console.error('[Full Analysis] Failed to update difficulty in DB:', updateError);
            } else {
                console.log(`[Full Analysis] Updated user ${userId} difficulty to ${ddaResult.new_difficulty}`);
            }
        }

        console.log('[Full Analysis] Complete:', combinedResult.summary);

        res.json(combinedResult);
    } catch (error) {
        console.error('[Full Analysis] Error:', error);
        res.status(500).json({
            error: 'Failed to complete full analysis',
            details: error.message
        });
    }
});

/**
 * POST /api/algorithm/matchmaking
 * Find match candidates by clustering players with similar skill levels (K-Means)
 * 
 * Body: {
 *   userId: string (the player looking for a match),
 *   k: number (optional, number of clusters, default 3)
 * }
 */
router.post('/matchmaking', authenticateUser, async (req, res) => {
    try {
        const { userId, k = 3 } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Fetch all active players with their IRT-related metrics
        // We use rank (EXP-based), win_rate, and games_played as skill indicators
        const { data: players, error: fetchError } = await supabase
            .from('users')
            .select('id, username, exp, rank, avatar_url')
            .neq('id', userId) // Exclude the requesting user for now
            .order('exp', { ascending: false })
            .limit(50); // Limit to top 50 active players

        if (fetchError) {
            console.error('[Matchmaking] Fetch error:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch players' });
        }

        if (!players || players.length < 2) {
            return res.json({
                status: 'no_match',
                message: 'Not enough players online for matchmaking',
                players: []
            });
        }

        // Get the requesting user's data
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('id, username, exp, rank, avatar_url')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('[Matchmaking] User fetch error:', userError);
            return res.status(400).json({ error: 'User not found' });
        }

        // Combine current user with other players for clustering
        const allPlayers = [currentUser, ...players];

        // 2a. Fetch Battle Stats for all candidate players + current user
        const allPlayerIds = allPlayers.map(p => p.id);

        const { data: battles, error: battleError } = await supabase
            .from('battles')
            .select('winner_id, player1_id, player2_id, status')
            .in('status', ['completed'])
            .or(`player1_id.in.(${allPlayerIds.join(',')}),player2_id.in.(${allPlayerIds.join(',')})`);

        // Helper to calculate stats
        const getPlayerStats = (pid) => {
            if (battleError || !battles) return { winRate: 0.5, total: 0 };

            let wins = 0;
            let total = 0;

            battles.forEach(b => {
                if (b.player1_id === pid || b.player2_id === pid) {
                    total++;
                    if (b.winner_id === pid) wins++;
                }
            });

            return {
                winRate: total > 0 ? wins / total : 0.5, // Default to 0.5 if no games
                total
            };
        };

        // Convert to IRT-like format for KMeans
        // We'll use: adjusted_theta (based on EXP), probability (Real Win Rate), success_rate, fail_rate
        const playersForKmeans = allPlayers.map(p => {
            const stats = getPlayerStats(p.id);
            // Normalize Rank/EXP. Assuming 50000 is high.
            const normalizedExp = Math.min((p.exp || 0) / 50000, 1.0);

            return {
                id: p.id,
                username: p.username,
                rank: p.rank || 'Unranked',
                adjusted_theta: normalizedExp,
                probability: stats.winRate,
                success_rate: stats.winRate, // Using Win Rate as proxy for success for now
                fail_rate: 1.0 - stats.winRate
            };
        });

        // Determine K
        let kValue = k;

        // RELAXED MATCHMAKING: If low population (< 6 players), force 1 cluster
        if (playersForKmeans.length < 6) {
            console.log('[Matchmaking] Low population detected ( < 6 players). Relaxing rules: Grouping all ranks together.');
            kValue = 1;
        } else {
            kValue = Math.min(k, Math.floor(playersForKmeans.length / 2));
        }

        const inputData = {
            players: playersForKmeans,
            k: kValue
        };

        console.log('[Matchmaking] Running K-Means with', playersForKmeans.length, 'players. K =', kValue);

        const result = await runPythonScript(KMEANS_ALGO_PATH, inputData);

        // Find the current user's cluster
        const currentUserCluster = result.players?.find(p => p.player_id === userId)?.cluster;

        // Filter to only players in the same cluster
        const suggestedOpponents = result.players?.filter(
            p => p.cluster === currentUserCluster && p.player_id !== userId
        ).map(p => {
            const originalPlayer = allPlayers.find(op => op.id === p.player_id);
            return {
                ...p,
                username: originalPlayer?.username,
                avatar_url: originalPlayer?.avatar_url,
                exp: originalPlayer?.exp
            };
        }) || [];

        console.log('[Matchmaking] Found', suggestedOpponents.length, 'potential matches in cluster', currentUserCluster);

        res.json({
            status: 'success',
            cluster: currentUserCluster,
            cluster_count: result.cluster_count,
            suggested_opponents: suggestedOpponents
        });

    } catch (error) {
        console.error('[Matchmaking] Error:', error);
        res.status(500).json({
            error: 'Failed to find matches',
            details: error.message
        });
    }
});

/**
 * GET /api/algorithm/status
 * Health check for the algorithm service
 */
router.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        algorithms: {
            irt: IRT_ALGO_PATH,
            dda: DDA_ALGO_PATH,
            kmeans: KMEANS_ALGO_PATH
        }
    });
});

export default router;
