import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI, progressAPI } from '../services/api';
import { getRankFromExp, getNextRank, getRankProgress } from '../utils/rankSystem';
import supabase from '../lib/supabase';

const UserContext = createContext();

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());

    // Format API user to match existing app structure
    const formatUser = (profile, authUser = null) => {
        if (!profile && !authUser) return null;

        const exp = profile?.xp || 0;
        const currentRank = getRankFromExp(exp);
        const nextRank = getNextRank(exp);
        const progress = getRankProgress(exp);

        // Prioritize full_name from Google if the profile username is just the email prefix
        const googleName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0];
        const profileName = profile?.username;
        const displayName = (profileName && profileName !== authUser?.email?.split('@')[0]) ? profileName : googleName;

        return {
            id: profile?.id || authUser?.id,
            name: displayName,
            email: profile?.email || authUser?.email,
            studentId: profile?.student_id || '',
            course: profile?.course || '',
            school: profile?.school || '',
            college: profile?.college || '',
            avatar: profile?.avatar_url || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture,
            level: currentRank.id,
            exp: exp,
            gems: profile?.gems || 0,
            role: profile?.role || 'student',
            rank: currentRank.name,
            rankName: currentRank.name,
            rankIcon: currentRank.icon,
            nextRank: nextRank?.name,
            pointsToNextRank: nextRank ? (nextRank.minExp - exp) : 0,
            rankProgress: progress,
            selectedHero: profile?.selected_hero || '3',
            selectedTheme: profile?.selected_theme || 'default',
            instructorCode: profile?.student_code || '',
            stats: {
                winnings: 0,
                losses: 0,
                winRate: "0%",
                leaderboardRank: 0
            },
            towerProgress: profile?.tower_progress || {},
            isBanned: profile?.is_banned || false
        };
    };

    // Lock to prevent concurrent checkAuth calls (F5 refresh causes mount + SIGNED_IN to race)
    const checkAuthInProgress = React.useRef(false);
    const initialCheckDone = React.useRef(false);
    // Guards to prevent onAuthStateChange from re-triggering checkAuth during active login/logout
    const loginInProgress = React.useRef(false);
    const logoutInProgress = React.useRef(false);

    const checkAuth = async () => {
        // Prevent concurrent calls — on F5, mount + SIGNED_IN fire almost simultaneously
        if (checkAuthInProgress.current) {
            return;
        }
        // Don't re-check if login or logout is actively in progress
        if (loginInProgress.current || logoutInProgress.current) {
            return;
        }
        checkAuthInProgress.current = true;
        try {
            // 0. GUARD: If user explicitly logged out, block any session restoration
            if (localStorage.getItem('code_siege_logged_out') === 'true') {
                localStorage.removeItem('auth_token');
                // Kill any Supabase-cached session silently
                try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) { }
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') || key.includes('supabase')) {
                        localStorage.removeItem(key);
                    }
                });
                setUser(null);
                setIsAuthenticated(false);
                return;
            }

            // 1. GUARD: If user is resetting password, don't interfere with the recovery session
            if (localStorage.getItem('code_siege_resetting_password') === 'true') {
                return;
            }

            // 1. Proactively check Supabase session (important for social redirects)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                localStorage.setItem('auth_token', session.access_token);
            }

            // 2. Proceed with backend check (with timeout to prevent infinite loading)
            if (authAPI.isAuthenticated()) {
                const getMeWithTimeout = Promise.race([
                    authAPI.getMe(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timed out')), 10000))
                ]);
                const { user: authUser, profile } = await getMeWithTimeout;
                if (authUser) {
                    setUser(formatUser(profile, authUser));
                    setIsAuthenticated(true);
                    return;
                }
            }

            // If we reach here, no valid session/token
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('[Auth] checkAuth error:', error);
            if (error.message && !error.message.includes('Invalid token') && !error.message.includes('401')) {
                console.error('Auth check failed:', error);
            }
            // Don't remove token on timeout — could be transient backend issue
            if (error.message !== 'Auth check timed out') {
                localStorage.removeItem('auth_token');
            }
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
            checkAuthInProgress.current = false;
            initialCheckDone.current = true;
        }
    };

    // 1. Initial Auth Check on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // 2. Stable Auth State Listener (Social Logins)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

            // Skip INITIAL_SESSION event — we already handle this via checkAuth on mount
            if (event === 'INITIAL_SESSION') return;

            if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session) {
                // GUARD: Ignore Supabase auto-restore if user explicitly logged out
                if (localStorage.getItem('code_siege_logged_out') === 'true') {
                    try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) { }
                    return;
                }
                // GUARD: Skip if login/logout is actively in progress — they handle state themselves
                if (loginInProgress.current || logoutInProgress.current) {
                    return;
                }

                localStorage.setItem('auth_token', session.access_token);
                if (event !== 'TOKEN_REFRESHED') {
                    // Only re-check if the initial mount check is done to avoid racing
                    if (initialCheckDone.current) {
                        await checkAuth();
                    } else {

                    }
                }
            } else if (event === 'SIGNED_OUT') {

                setUser(null);
                setIsAuthenticated(false);
                localStorage.removeItem('auth_token');
            }
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    // 3. Realtime User Data & Presence (depends on user.id)
    useEffect(() => {
        let profileChannel;
        let globalPresenceChannel;
        let heartbeatInterval;

        if (user?.id) {
            // Start heartbeat ping
            heartbeatInterval = setInterval(async () => {
                try {
                    await authAPI.heartbeat();
                } catch (err) {
                    console.error('Heartbeat failed:', err);
                }
            }, 30000);

            // Profile updates
            profileChannel = supabase
                .channel(`user-profile-${user.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
                    (payload) => {

                        setUser(prev => ({ ...prev, ...formatUser(payload.new, user) }));
                    }
                )
                .subscribe();

            // Global Presence
            globalPresenceChannel = supabase.channel('global-presence', {
                config: {
                    presence: {
                        key: String(user.id),
                    },
                },
            });

            globalPresenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = globalPresenceChannel.presenceState();
                    const onlineIds = new Set(Object.keys(state).map(id => String(id)));

                    setOnlineUserIds(onlineIds);
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    const state = globalPresenceChannel.presenceState();
                    setOnlineUserIds(new Set(Object.keys(state).map(id => String(id))));
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    const state = globalPresenceChannel.presenceState();
                    setOnlineUserIds(new Set(Object.keys(state).map(id => String(id))));
                })
                .subscribe(async (status) => {

                    if (status === 'SUBSCRIBED') {
                        const tracked = await globalPresenceChannel.track({
                            id: user.id,
                            name: user.name,
                            online_at: new Date().toISOString(),
                        });

                    }
                });
        }

        return () => {
            if (profileChannel) supabase.removeChannel(profileChannel);
            if (globalPresenceChannel) supabase.removeChannel(globalPresenceChannel);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user?.id]);

    const register = async (email, password, username, options = {}) => {
        const response = await authAPI.register(email, password, username, options);
        // Auto-login after successful student registration (if session returned)
        if (response.session?.access_token && response.profile && !response.applicationPending) {
            loginInProgress.current = true;
            try {
                localStorage.removeItem('code_siege_logged_out');
                localStorage.setItem('auth_token', response.session.access_token);
                setUser(formatUser(response.profile, response.user));
                setIsAuthenticated(true);
                setLoading(false);
                await supabase.auth.setSession({
                    access_token: response.session.access_token,
                    refresh_token: response.session.refresh_token || ''
                });
            } catch (err) {
                console.error('[Auth] Session sync after register failed:', err);
            } finally {
                loginInProgress.current = false;
            }
        }
        return response;
    };

    const login = async (identifier, password, useStudentId = false, expectedRole = null) => {
        loginInProgress.current = true;
        try {
            const response = await authAPI.login(identifier, password, useStudentId, expectedRole);
            if (response.profile) {
                setUser(formatUser(response.profile));
                setIsAuthenticated(true);
                setLoading(false); // Ensure loading is cleared after successful login
                if (response.session) {
                    // Clear logged-out flag on successful login
                    localStorage.removeItem('code_siege_logged_out');
                    localStorage.setItem('auth_token', response.session.access_token);
                    // Await setSession to prevent race with onAuthStateChange
                    try {
                        await supabase.auth.setSession({
                            access_token: response.session.access_token,
                            refresh_token: response.session.refresh_token || ''
                        });
                    } catch (err) {
                        console.error('[Auth] Session sync failed (non-blocking):', err);
                    }
                }
            }
            return response;
        } finally {
            // Small delay to ensure onAuthStateChange SIGNED_IN event is suppressed
            setTimeout(() => { loginInProgress.current = false; }, 500);
        }
    };

    const loginWithGoogle = async () => {
        try {
            await authAPI.signInWithGoogle();
        } catch (error) {
            console.error('Google login failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        logoutInProgress.current = true;
        // FIRST: Set logged-out flag before anything else — survives hard refresh
        localStorage.setItem('code_siege_logged_out', 'true');
        // Immediately clear React state so UI reacts instantly
        // NOTE: Keep auth_token in localStorage until AFTER the backend call
        // (the backend needs the Authorization header to identify the user and clear last_active_at)
        setUser(null);
        setIsAuthenticated(false);
        try {
            // 1. Notify backend (clears last_active_at) — token still in localStorage!
            try {
                await authAPI.logout();
            } catch (err) {
                console.error('Logout API failed (non-blocking):', err);
            }
            // 2. NOW clear the auth token (after backend received it)
            localStorage.removeItem('auth_token');
            // 3. Clear local Supabase client state (backend already invalidated the server session)
            try {
                await supabase.auth.signOut({ scope: 'local' });
            } catch (_) { /* ignore — session may already be gone */ }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // 4. Force-clear auth token (in case step 2 was skipped by error)
            localStorage.removeItem('auth_token');
            // 5. Clear ALL Supabase-managed localStorage keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.includes('supabase')) {
                    localStorage.removeItem(key);
                }
            });
            // Release guard after a delay so onAuthStateChange SIGNED_OUT is suppressed
            setTimeout(() => { logoutInProgress.current = false; }, 500);
        }
    };

    const updateAvatar = async (file) => {
        if (!user) return;
        try {
            const response = await userAPI.updateAvatar(user.id, file);
            if (response.profile) {
                const formatted = formatUser(response.profile, user);
                setUser(prev => ({ ...prev, ...formatted }));
            }
        } catch (error) {
            console.error('Failed to update avatar:', error);
            throw error;
        }
    };

    const updateProfile = async (profileData) => {
        if (!user) return;
        try {
            // Map old roles to new roles to avoid constraint violations
            const role = profileData.role === 'teacher' ? 'instructor' :
                (profileData.role === 'user' ? 'student' : (profileData.role || 'student'));

            const response = await userAPI.updateProfile(user.id, {
                username: profileData.username || profileData.name || user.name,
                school: profileData.school,
                college: profileData.college,
                course: profileData.course,
                student_id: profileData.student_id,
                role: role,
                email: profileData.email,
                gender: profileData.gender,
                selected_hero: profileData.selectedHero,
                selected_theme: profileData.selectedTheme,
                student_code: profileData.student_code
            });

            if (response.profile) {
                const formatted = formatUser(response.profile, user);
                setUser(prev => ({ ...prev, ...formatted }));
            } else {
                setUser(prev => ({ ...prev, ...profileData, name: profileData.name }));
            }
            return response;
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    };

    const updateTowerProgress = async (towerId, floor, score = 0) => {
        if (!user) return;
        try {
            await progressAPI.completeFloor(towerId, floor, score);
            setUser(prev => ({
                ...prev,
                towerProgress: {
                    ...prev.towerProgress,
                    [towerId]: Math.max(prev.towerProgress?.[towerId] || 0, floor)
                }
            }));
        } catch (error) {
            console.error('Failed to update progress:', error);
            throw error;
        }
    };

    const updateExp = async (amount) => {
        if (!user) return;
        // 1. Optimistically update local state so UI reflects immediately
        const newExp = (user.exp || 0) + amount;
        const rankData = getRankFromExp(newExp);
        setUser(prev => ({
            ...prev,
            exp: newExp,
            rankName: rankData?.name || prev.rankName,
            rankIcon: rankData?.icon || prev.rankIcon,
        }));
        // 2. Sync to backend (best effort — don't throw so UI callers aren't blocked)
        try {
            const response = await progressAPI.addXP(amount);
            if (response?.xp !== undefined) {
                const serverRank = getRankFromExp(response.xp);
                setUser(prev => ({
                    ...prev,
                    exp: response.xp,
                    level: response.level ?? prev.level,
                    rankName: serverRank?.name || prev.rankName,
                    rankIcon: serverRank?.icon || prev.rankIcon,
                }));
            }
            return response;
        } catch (error) {
            console.error('Failed to sync XP to backend (local state already updated):', error);
        }
    };

    const updateGems = async (amount) => {
        if (!user) return;
        try {
            const response = await userAPI.updateGems(user.id, amount);
            setUser(prev => ({
                ...prev,
                gems: response.gems
            }));
            return response;
        } catch (error) {
            console.error('Failed to update gems:', error);
            throw error;
        }
    };

    const value = {
        user, setUser, loading, isAuthenticated, onlineUserIds,
        register, login, loginWithGoogle, logout,
        updateAvatar, updateProfile, updateTowerProgress, updateExp, updateGems, checkAuth
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
