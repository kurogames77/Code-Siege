/**
 * API Service for Code Siege
 * Handles all communication with the backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get stored auth token
 */
const getToken = () => localStorage.getItem('auth_token');

/**
 * Set auth token
 */
const setToken = (token) => {
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
};

/**
 * Make authenticated API request
 */
const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    let safeBody = '';
    if (options.body) {
        try {
            const parsed = JSON.parse(options.body);
            if (parsed.password) {
                parsed.password = '***CENSORED***';
            }
            safeBody = parsed;
        } catch (e) {
            safeBody = options.body;
        }
    }

    console.log(`[API] Request: ${options.method || 'GET'} ${endpoint}`, safeBody);
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    console.log(`[API] Response: ${response.status} ${endpoint}`);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || 'API request failed');
        error.details = data.details;
        error.stack = data.stack;
        throw error;
    }

    return data;
};

// ============================================
// AUTH API
// ============================================

export const authAPI = {
    register: async (email, password, username, { student_id, course, role } = {}) => {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username, student_id, course, role }),
        });
        if (data.session?.access_token) {
            setToken(data.session.access_token);
        }
        return data;
    },

    login: async (identifier, password, useStudentId = false) => {
        const body = useStudentId
            ? { student_id: identifier, password }
            : { email: identifier, password };

        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (data.session?.access_token) {
            setToken(data.session.access_token);
        }
        return data;
    },

    logout: async () => {
        try {
            await apiRequest('/auth/logout', { method: 'POST' });
        } finally {
            setToken(null);
        }
    },

    getMe: async () => {
        return apiRequest('/auth/me');
    },

    heartbeat: async () => {
        return apiRequest('/auth/heartbeat', { method: 'POST' });
    },

    signInWithGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
        return data;
    },

    isAuthenticated: () => !!getToken(),
};

import supabase from '../lib/supabase';

// ============================================
// USER API
// ============================================

export const userAPI = {
    getProfile: async (userId) => {
        return apiRequest(`/users/${userId}`);
    },

    updateProfile: async (userId, data) => {
        return apiRequest(`/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    updateAvatar: async (userId, file) => {
        // 1. Upload to Supabase Storage
        const fileExt = file.name ? file.name.split('.').pop() : 'png';
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            if (uploadError.message === 'Bucket not found') {
                throw new Error('Storage Error: The "avatars" bucket does not exist. Please create it in your Supabase dashboard.');
            }
            if (uploadError.status === 403 || uploadError.message === 'Permission denied') {
                throw new Error('Storage Error: Permission denied. Please ensure you have added the correct RLS policies to the "avatars" bucket.');
            }
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. Update profile in database via our API
        return apiRequest(`/users/${userId}/avatar`, {
            method: 'PATCH',
            body: JSON.stringify({ avatar_url: publicUrl }),
        });
    },

    updateGems: async (userId, amount) => {
        return apiRequest(`/users/${userId}/gems`, {
            method: 'PATCH',
            body: JSON.stringify({ amount }),
        });
    },
};

// ============================================
// PROGRESS API
// ============================================

export const progressAPI = {
    getProgress: async () => {
        return apiRequest('/progress');
    },

    completeFloor: async (towerId, floor, score) => {
        return apiRequest('/progress/complete', {
            method: 'POST',
            body: JSON.stringify({ tower_id: towerId, floor, score }),
        });
    },

    addXP: async (amount) => {
        return apiRequest('/progress/xp', {
            method: 'PATCH',
            body: JSON.stringify({ amount }),
        });
    },
};

// ============================================
// ACHIEVEMENTS API
// ============================================

export const achievementsAPI = {
    getAll: async () => {
        return apiRequest('/achievements');
    },

    updateProgress: async (achievementId, progress) => {
        return apiRequest(`/achievements/${achievementId}`, {
            method: 'PATCH',
            body: JSON.stringify({ progress }),
        });
    },
};

// ============================================
// CERTIFICATES API
// ============================================

export const certificatesAPI = {
    getAll: async () => {
        return apiRequest('/certificates');
    },

    issue: async (course, score, instructor) => {
        return apiRequest('/certificates', {
            method: 'POST',
            body: JSON.stringify({ course, score, instructor }),
        });
    },

    verify: async (certificateId) => {
        return apiRequest(`/certificates/verify/${certificateId}`);
    },
};

// ============================================
// SHOP API
// ============================================

export const shopAPI = {
    getItems: async () => {
        return apiRequest('/shop');
    },

    getInventory: async () => {
        return apiRequest('/shop/inventory');
    },

    purchase: async (itemId) => {
        return apiRequest('/shop/purchase', {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId }),
        });
    },
};

// ============================================
// LEADERBOARD API
// ============================================

export const leaderboardAPI = {
    getAll: async (limit = 100) => {
        return apiRequest(`/leaderboard?limit=${limit}`);
    },

    getWeekly: async (limit = 50) => {
        return apiRequest(`/leaderboard/weekly?limit=${limit}`);
    },

    getTower: async (towerId, limit = 50) => {
        return apiRequest(`/leaderboard/tower/${towerId}?limit=${limit}`);
    },
};

// ============================================
// BATTLES API
// ============================================

export const battlesAPI = {
    getHistory: async () => {
        return apiRequest('/battles');
    },

    create: async (mode, opponentId) => {
        return apiRequest('/battles/create', {
            method: 'POST',
            body: JSON.stringify({ mode, opponent_id: opponentId }),
        });
    },

    join: async (battleId) => {
        return apiRequest(`/battles/${battleId}/join`, {
            method: 'PATCH',
        });
    },

    complete: async (battleId, winnerId, player1Score, player2Score) => {
        return apiRequest(`/battles/${battleId}/complete`, {
            method: 'PATCH',
            body: JSON.stringify({
                winner_id: winnerId,
                player1_score: player1Score,
                player2_score: player2Score
            }),
        });
    },
};


// ============================================
// AI API
// ============================================

export const aiAPI = {
    generateLevels: async (language, difficulty, mode) => {
        return apiRequest('/ai/generate-levels', {
            method: 'POST',
            body: JSON.stringify({ language, difficulty, mode }),
        });
    },

    debugCode: async (code, language, problemDescription) => {
        return apiRequest('/ai/debug-code', {
            method: 'POST',
            body: JSON.stringify({ code, language, problemDescription }),
        });
    },

    verifyCode: async (code, language, problemDescription, expectedOutput) => {
        return apiRequest('/ai/verify-code', {
            method: 'POST',
            body: JSON.stringify({ code, language, problemDescription, expectedOutput }),
        });
    },
};

// ============================================
// ALGORITHM API (IRT, DDA, KMeans)
// ============================================

export const algorithmAPI = {
    // Full IRT + DDA analysis for adaptive difficulty
    fullAnalysis: async (userId, time, errors, hints, currentDifficulty) => {
        return apiRequest('/algorithm/full-analysis', {
            method: 'POST',
            body: JSON.stringify({ userId, time, errors, hints, currentDifficulty }),
        });
    },

    // KMeans matchmaking - find players in the same skill cluster
    matchmaking: async (userId, k = 3) => {
        return apiRequest('/algorithm/matchmaking', {
            method: 'POST',
            body: JSON.stringify({ userId, k }),
        });
    },

    // Health check
    status: async () => {
        return apiRequest('/algorithm/status');
    },
};

// INSTRUCTOR API
// ============================================

export const instructorAPI = {
    getStats: async () => {
        return apiRequest('/instructor/stats');
    },

    getUsers: async (page = 1, limit = 20, search = '') => {
        return apiRequest(`/instructor/users?page=${page}&limit=${limit}&search=${search}`);
    },

    banUser: async (userId, isBanned) => {
        return apiRequest(`/instructor/users/${userId}/ban`, {
            method: 'PATCH',
            body: JSON.stringify({ is_banned: isBanned }),
        });
    },

    changeRole: async (userId, role) => {
        return apiRequest(`/instructor/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        });
    },

    deleteUser: async (userId) => {
        return apiRequest(`/instructor/users/${userId}`, {
            method: 'DELETE',
        });
    },

    updateUser: async (userId, updates) => {
        return apiRequest(`/instructor/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },

    // Application Management
    getApplications: async (status = 'pending') => {
        return apiRequest(`/instructor/applications?status=${status}`);
    },

    approveApplication: async (applicationId) => {
        return apiRequest(`/instructor/applications/${applicationId}/approve`, {
            method: 'POST',
        });
    },

    rejectApplication: async (applicationId, reason = '') => {
        return apiRequest(`/instructor/applications/${applicationId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    // Shop management
    addShopItem: async (item) => {
        return apiRequest('/instructor/shop', {
            method: 'POST',
            body: JSON.stringify(item),
        });
    },

    updateShopItem: async (itemId, item) => {
        return apiRequest(`/instructor/shop/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(item),
        });
    },

    deleteShopItem: async (itemId) => {
        return apiRequest(`/instructor/shop/${itemId}`, {
            method: 'DELETE',
        });
    },

    // Certificates
    getCertificates: async (page = 1, limit = 20) => {
        return apiRequest(`/instructor/certificates?page=${page}&limit=${limit}`);
    },

    revokeCertificate: async (certId) => {
        return apiRequest(`/instructor/certificates/${certId}`, {
            method: 'DELETE',
        });
    },

    // Battles
    getBattles: async (page = 1, limit = 20) => {
        return apiRequest(`/instructor/battles?page=${page}&limit=${limit}`);
    },

    // Courses
    getCourses: async () => {
        return apiRequest('/instructor/courses');
    },

    saveCourse: async (course) => {
        return apiRequest('/instructor/courses', {
            method: 'POST',
            body: JSON.stringify(course),
        });
    },

    deleteCourse: async (courseId) => {
        return apiRequest(`/instructor/courses/${courseId}`, {
            method: 'DELETE',
        });
    },

    saveLevels: async (courseId, levels, mode, difficulty) => {
        return apiRequest(`/instructor/courses/${courseId}/levels`, {
            method: 'POST',
            body: JSON.stringify({ levels, mode, difficulty }),
        });
    },

    updateLevel: async (levelId, updates) => {
        return apiRequest(`/instructor/courses/levels/${levelId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },

    // Get system logs
    getLogs: async (page = 1, limit = 50, filter = 'ALL') => {
        let query = supabase
            .from('system_logs')
            .select('*', { count: 'exact' });

        if (filter !== 'ALL') {
            query = query.eq('level', filter);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        return {
            logs: data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    },
};

// ============================================
// COURSES API (Public)
// ============================================

export const coursesAPI = {
    getCourses: async () => {
        return apiRequest('/courses');
    },

    getLevels: async (courseId, mode, difficulty) => {
        const query = new URLSearchParams();
        if (mode) query.append('mode', mode);
        if (difficulty) query.append('difficulty', difficulty);
        const queryString = query.toString();
        const data = await apiRequest(`/courses/${courseId}/levels${queryString ? `?${queryString}` : ''}`);

        return (data || []).map(lvl => ({
            ...lvl,
            initialBlocks: typeof lvl.initial_blocks === 'string' ? JSON.parse(lvl.initial_blocks) : lvl.initial_blocks,
            correctSequence: typeof lvl.correct_sequence === 'string' ? JSON.parse(lvl.correct_sequence) : lvl.correct_sequence,
            initialCode: lvl.initial_code,
            expectedOutput: lvl.expected_output,
            hints: typeof lvl.hints === 'string' ? JSON.parse(lvl.hints) : lvl.hints,
            rewards: typeof lvl.rewards === 'string' ? JSON.parse(lvl.rewards) : lvl.rewards,
        }));
    },

    getLevel: async (courseId, levelOrder, mode, difficulty) => {
        const query = new URLSearchParams();
        if (mode) query.append('mode', mode);
        if (difficulty) query.append('difficulty', difficulty);
        const queryString = query.toString();
        const lvl = await apiRequest(`/courses/${courseId}/levels/${levelOrder}${queryString ? `?${queryString}` : ''}`);

        return {
            ...lvl,
            initialBlocks: typeof lvl.initial_blocks === 'string' ? JSON.parse(lvl.initial_blocks) : lvl.initial_blocks,
            correctSequence: typeof lvl.correct_sequence === 'string' ? JSON.parse(lvl.correct_sequence) : lvl.correct_sequence,
            initialCode: lvl.initial_code,
            expectedOutput: lvl.expected_output,
            hints: typeof lvl.hints === 'string' ? JSON.parse(lvl.hints) : lvl.hints,
            rewards: typeof lvl.rewards === 'string' ? JSON.parse(lvl.rewards) : lvl.rewards,
        };
    },
};

// ============================================
// PAYMONGO API
// ============================================

export const paymongoAPI = {
    // Unified Direct Flow (Payment Intent + Attachment)
    // Works for both 'gcash' and 'paymaya'
    createPaymentIntent: (amount, description, paymentMethod, redirect) => apiRequest('/paymongo/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({
            amount,
            description,
            paymentMethod, // 'gcash' or 'maya'
            redirectUrls: {
                success: redirect.success,
                failed: redirect.failed
            }
        })
    }),

    getPaymentIntent: (id) => apiRequest(`/paymongo/payment-intent/${id}`),

    // Checkout Session (Reliable fallback for GCash)
    createCheckoutSession: (amount, description, redirect, userData, method) => apiRequest('/paymongo/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
            amount,
            description,
            successUrl: redirect.success,
            cancelUrl: redirect.failed,
            name: userData?.name,
            email: userData?.email,
            phone: userData?.phone,
            method // 'gcash'
        })
    }),

    getCheckoutSession: (id) => apiRequest(`/paymongo/checkout-session/${id}`),
};

export default {
    auth: authAPI,
    user: userAPI,
    progress: progressAPI,
    achievements: achievementsAPI,
    certificates: certificatesAPI,
    shop: shopAPI,
    leaderboard: leaderboardAPI,
    battles: battlesAPI,
    instructor: instructorAPI,
    ai: aiAPI,
    courses: coursesAPI,
    algorithm: algorithmAPI,
    paymongo: paymongoAPI,
};
