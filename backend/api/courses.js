import express from 'express';
import supabase from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/courses
 * Get all courses (public)
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Fetch level counts and completeness for each course
        const coursesWithCounts = await Promise.all(courses.map(async (course) => {
            const { data } = await supabase
                .from('course_levels')
                .select('course_mode, difficulty_level, level_order')
                .eq('course_id', course.id);

            const combinations = new Set();
            // Count distinct floors: each unique (course_mode, level_order) pair = 1 floor
            const uniqueFloors = new Set();
            if (data) {
                data.forEach(level => {
                    const mode = (level.course_mode || '').toLowerCase();
                    const diff = (level.difficulty_level || '').toLowerCase();
                    combinations.add(`${mode}-${diff}`);
                    uniqueFloors.add(`${level.course_mode}-${level.level_order}`);
                });
            }

            const requiredModes = ['beginner', 'intermediate', 'advance'];
            const requiredDiffs = ['easy', 'medium', 'hard'];
            let isReady = true;

            for (const mode of requiredModes) {
                for (const diff of requiredDiffs) {
                    // Note: 'advance' might have been stored as 'advanced' in some cases, so checking both might be safer, but the DB default is 'Advance'
                    // The schema has mode checking, let's allow 'advance' or 'advanced' just in case.
                    const hasCombination = combinations.has(`${mode}-${diff}`) || (mode === 'advance' && combinations.has(`advanced-${diff}`));
                    if (!hasCombination) {
                        isReady = false;
                        break;
                    }
                }
                if (!isReady) break;
            }

            return {
                ...course,
                total_levels: uniqueFloors.size,
                is_fully_generated: isReady
            };
        }));

        res.json(coursesWithCounts);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Failed to get courses' });
    }
});

/**
 * GET /api/courses/:courseId/levels
 * Get all levels for a specific course (public/authenticated)
 */
router.get('/:courseId/levels', authenticateUser, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { mode, difficulty } = req.query;

        let query = supabase
            .from('course_levels')
            .select('*')
            .eq('course_id', courseId);

        if (mode) query = query.eq('course_mode', mode);
        if (difficulty) query = query.eq('difficulty_level', difficulty);

        const { data: levels, error } = await query.order('level_order', { ascending: true });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json(levels || []);
    } catch (error) {
        console.error('Get course levels error:', error);
        res.status(500).json({ error: 'Failed to get course levels' });
    }
});

/**
 * GET /api/courses/:courseId/levels/:levelOrder
 * Get a specific level details
 * Auto-syncs blocks if solution was updated outside the app (e.g. direct DB edit)
 */
router.get('/:courseId/levels/:levelOrder', authenticateUser, async (req, res) => {
    try {
        const { courseId, levelOrder } = req.params;
        const { mode, difficulty } = req.query;

        let query = supabase
            .from('course_levels')
            .select('*')
            .eq('course_id', courseId)
            .eq('level_order', levelOrder);

        if (mode) query = query.eq('course_mode', mode);
        if (difficulty) query = query.eq('difficulty_level', difficulty);

        const { data: level, error } = await query.single();

        if (error) {
            return res.status(404).json({ error: 'Level not found' });
        }

        // Auto-sync: Check if blocks match the current solution
        const courseMode = level.course_mode || 'Beginner';
        const isAdvance = courseMode === 'Advance' || courseMode === 'Advanced';

        if (!isAdvance && level.solution) {
            try {
                const { blocksMatchSolution, generateBlocksFromSolution } = await import('../utils/blockGenerator.js');

                let existingBlocks = level.initial_blocks;
                if (typeof existingBlocks === 'string') {
                    try { existingBlocks = JSON.parse(existingBlocks); } catch { existingBlocks = []; }
                }

                if (!blocksMatchSolution(existingBlocks, level.solution)) {
                    console.log(`[Block Sync] Mismatch detected for level ${level.id}, regenerating blocks...`);
                    const blockData = generateBlocksFromSolution(level.solution, courseMode);

                    if (blockData) {
                        // Save regenerated blocks back to DB
                        const { error: syncError } = await supabase
                            .from('course_levels')
                            .update({
                                initial_blocks: JSON.stringify(blockData.initialBlocks),
                                correct_sequence: JSON.stringify(blockData.correctSequence)
                            })
                            .eq('id', level.id);

                        if (!syncError) {
                            level.initial_blocks = blockData.initialBlocks;
                            level.correct_sequence = blockData.correctSequence;
                            console.log(`[Block Sync] Successfully synced ${blockData.initialBlocks.length} blocks`);
                        }
                    }
                }
            } catch (syncErr) {
                console.warn('[Block Sync] Non-fatal sync error:', syncErr.message);
            }
        }

        res.json(level);
    } catch (error) {
        console.error('Get specific level error:', error);
        res.status(500).json({ error: 'Failed to get level' });
    }
});

export default router;
