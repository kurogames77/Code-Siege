import express from 'express';
import crypto from 'crypto';
import supabase, { supabaseService } from '../lib/supabase.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user (students immediately, instructors go to pending)
 */
router.post('/register', async (req, res) => {
    console.log('[Auth] POST /register request received');
    res.setHeader('X-Backend-Version', '2.2');
    try {
        let { email, password, username, student_id, course, role } = req.body;

        // Trim inputs
        if (email) email = email.trim();
        if (student_id) student_id = student_id.trim();

        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Email, password, and username are required' });
        }

        // Ensure service role client is available for profile creation
        if (!supabaseService) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing. Cannot create user profiles.');
            return res.status(500).json({ error: 'Server configuration error: Contact administrator' });
        }

        // INSTRUCTOR REGISTRATION: Store as pending application (no auth user yet)
        if (role === 'teacher') {
            // Check if email already exists in applications or users
            // Use supabaseService to bypass RLS
            const { data: existingApp } = await supabaseService
                .from('instructor_applications')
                .select('id, status')
                .eq('email', email)
                .single();

            if (existingApp) {
                if (existingApp.status === 'pending') {
                    return res.status(400).json({ error: 'An application with this email is already pending review' });
                }
                if (existingApp.status === 'approved') {
                    return res.status(400).json({ error: 'This email has already been approved. Please check your inbox for the confirmation link.' });
                }
            }

            // Check if email exists in users table
            const { data: existingUser } = await supabaseService
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                return res.status(400).json({ error: 'Email is already registered' });
            }

            // Store the application (password stored temporarily - will be used when approved)
            const { data: application, error: appError } = await supabaseService
                .from('instructor_applications')
                .insert({
                    email,
                    username,
                    password_hash: password, // Store plain for now, admin will create user with this
                    student_id: student_id || null,
                    course: course || null,
                    status: 'pending'
                })
                .select()
                .single();

            if (appError) {
                console.error('Application creation error:', appError);
                if (appError.code === '23505') {
                    return res.status(400).json({ error: 'An application with this email already exists' });
                }
                return res.status(400).json({
                    error: `Failed to submit application: ${appError.message}`,
                    details: appError.details || appError.hint
                });
            }

            logger.info('AUTH_SERVICE', `New instructor application submitted: ${username} (${email})`);

            return res.status(201).json({
                message: 'Application submitted successfully. You will receive an email once an administrator approves your account.',
                applicationPending: true,
                applicationId: application.id
            });
        }

        // STUDENT REGISTRATION: Normal flow with immediate signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username
                },
                emailRedirectTo: `${process.env.CLIENT_URL}/ConfirmationPage`
            }
        });

        if (authError) {
            console.error('Auth error:', authError);
            if (authError.message.includes('already registered')) {
                return res.status(400).json({ error: 'Email is already registered' });
            }
            if (authError.message.includes('Password should be')) {
                return res.status(400).json({ error: 'Password is too weak (min 6 chars)' });
            }
            return res.status(400).json({ error: authError.message });
        }

        // Create user profile in users table
        // IMPORTANT: Use supabaseService (service role) to bypass RLS.
        // A Supabase trigger on auth.users auto-creates a profile row
        // (with email prefix as username, NULL student_id, default gems)
        // immediately after signUp(). We WAIT for the trigger row to exist,
        // then UPDATE it with the correct data.
        let profile = null;
        let profileError = null;

        const correctProfileData = {
            username,
            student_id: student_id || null,
            course: course || null,
            role: 'user',
            level: 1,
            xp: 0,
            gems: 0,
            selected_hero: '3',
            selected_theme: 'default'
        };

        // Wait for trigger to create the row, then UPDATE it
        // Retry up to 5 times with increasing delay
        const maxRetries = 5;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // Wait for trigger to complete (increasing delay each retry)
            const delay = attempt === 1 ? 500 : attempt * 1000;
            console.log(`[Auth] Waiting ${delay}ms for trigger (attempt ${attempt}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            const { data: updatedProfile, error: updateError } = await supabaseService
                .from('users')
                .update(correctProfileData)
                .eq('id', authData.user.id)
                .select()
                .single();

            if (updatedProfile && !updateError) {
                profile = updatedProfile;
                console.log(`[Auth] Profile updated successfully on attempt ${attempt}:`, {
                    username: profile.username,
                    student_id: profile.student_id,
                    course: profile.course
                });
                break;
            }

            console.log(`[Auth] UPDATE attempt ${attempt} failed:`, updateError?.message || 'No row returned');

            // On last attempt, try INSERT as absolute fallback
            if (attempt === maxRetries) {
                console.log('[Auth] All UPDATE attempts failed. Trying INSERT as fallback...');
                const { data: insertedProfile, error: insertError } = await supabaseService
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        email,
                        ...correctProfileData
                    })
                    .select()
                    .single();

                if (insertedProfile && !insertError) {
                    profile = insertedProfile;
                    console.log('[Auth] Profile created via INSERT fallback');
                } else {
                    profileError = insertError || new Error('Profile creation failed after all retries');
                    console.error('[Auth] INSERT fallback also failed:', profileError);
                }
            }
        }

        if (profileError) {
            logger.error('AUTH_SERVICE', `Profile creation failed for ${email}`, { error: profileError });
            return res.status(201).json({
                message: 'Registration successful (with profile warning)',
                warning: 'Profile creation incomplete',
                user: authData.user,
                profile: null,
                session: authData.session
            });
        }

        logger.info('AUTH_SERVICE', `New student registered: ${username} (${email}), student_id: ${student_id}`);

        res.status(201).json({
            message: 'Registration successful v2.2',
            user: authData.user,
            profile,
            session: authData.session
        });
    } catch (error) {
        console.error('Register error:', error);
        logger.error('AUTH_SERVICE', 'Registration system error', { error: error.message });
        // Return actual error for debugging
        res.status(500).json({ error: `Registration failed: ${error.message}` });
    }
});


/**
 * POST /api/auth/login
 * Login user (supports email or student_id)
 */
router.post('/login', async (req, res) => {
    console.log('[Auth] POST /login request received');
    res.setHeader('X-Backend-Version', '2.2');
    try {
        let { email, password, student_id } = req.body;

        // Trim inputs
        if (email) email = email.trim();
        if (student_id) student_id = student_id.trim();

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        if (!email && !student_id) {
            return res.status(400).json({ error: 'Student ID is required' });
        }

        let loginEmail = email;

        // If student_id provided (used for both Student and Instructor login), look up the email
        if (student_id && !email) {
            // Use supabaseService to bypass RLS (user isn't authenticated yet)
            const { data: userProfile, error: lookupError } = await supabaseService
                .from('users')
                .select('email')
                .eq('student_id', student_id)
                .single();

            if (lookupError || !userProfile) {
                console.log(`[Auth] ID lookup failed:`, lookupError);
                // Don't log ID missing as it might be brute force noise, or do log as WARN
                logger.warn('AUTH_SERVICE', `Login failed: ID not found ${student_id}`);
                return res.status(401).json({ error: 'ID not found' });
            }

            loginEmail = userProfile.email;
            console.log(`[Auth] Found email for ID: ${loginEmail}`);
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password
        });

        if (error) {
            console.error(`[Auth] Login failed for ${loginEmail}:`, error.message);
            logger.warn('AUTH_SERVICE', `Login failed for ${loginEmail}`, { reason: error.message });

            if (error.message.includes('Email not confirmed')) {
                return res.status(401).json({ error: 'Email not confirmed. Please check your inbox.' });
            }
            if (error.message.includes('Invalid login credentials')) {
                return res.status(401).json({ error: 'Incorrect id or password' });
            }

            return res.status(401).json({ error: error.message || 'Login failed' });
        }

        // Generate a new session ID for 1-session-per-student enforcement
        const active_session_id = crypto.randomUUID();

        // Update the user's active_session_id in DB (bypass RLS)
        await supabaseService
            .from('users')
            .update({ active_session_id })
            .eq('id', data.user.id);

        // Get user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        logger.info('AUTH_SERVICE', `User logged in: ${profile?.username || loginEmail} (${profile?.role || 'user'}), Session: ${active_session_id}`);

        res.json({
            message: 'Login successful',
            user: data.user,
            profile,
            session: data.session
        });
    } catch (error) {
        console.error('Login error:', error);
        logger.error('AUTH_SERVICE', 'Login system error', { error: error.message });
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
    try {
        // Try to identify user before logout for logging purposes
        let identity = 'Unknown User';
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                // Try to get profile
                const { data: profile } = await supabase.from('users').select('username, email').eq('id', user.id).single();
                identity = profile?.username || user.email || identity;
            }
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        logger.info('AUTH_SERVICE', `User logged out: ${identity}`);

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user from token
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        res.json({ user, profile });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;
