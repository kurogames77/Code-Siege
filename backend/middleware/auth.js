import supabase from '../lib/supabase.js';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Get user profile with role
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        req.user = { ...user, ...profile };
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);

            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                req.user = { ...user, ...profile };
            } else {
                req.user = null;
            }
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

/**
 * Middleware to require instructor or admin role
 */
export const requireInstructor = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Instructor access required' });
        }

        next();
    } catch (error) {
        console.error('Instructor middleware error:', error);
        res.status(500).json({ error: 'Authorization failed' });
    }
};

/**
 * Middleware to require admin role only
 */
export const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ error: 'Authorization failed' });
    }
};

export default { authenticateUser, optionalAuth, requireInstructor, requireAdmin };
