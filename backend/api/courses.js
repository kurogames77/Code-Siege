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

        // Fetch level counts for each course
        const coursesWithCounts = await Promise.all(courses.map(async (course) => {
            const { count } = await supabase
                .from('course_levels')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id);

            return {
                ...course,
                total_levels: count || 0
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

        res.json(level);
    } catch (error) {
        console.error('Get specific level error:', error);
        res.status(500).json({ error: 'Failed to get level' });
    }
});

export default router;
