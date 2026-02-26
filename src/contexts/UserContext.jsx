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

    useEffect(() => {
        checkAuth();

        // Listen for auth state changes (essential for social logins)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] State change event:', event, 'Session active:', !!session);
            if (event === 'SIGNED_IN' && session) {
                console.log('[Auth] Social login detected, syncing session...');
                localStorage.setItem('auth_token', session.access_token);
                await checkAuth();
            } else if (event === 'SIGNED_OUT') {
                console.log('[Auth] User signed out');
                setUser(null);
                setIsAuthenticated(false);
                localStorage.removeItem('auth_token');
            }
        });

        // Dynamic Realtime Listener for the current user's profile
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
            }, 30000); // Send heartbeat every 30 seconds

            // Profile updates
            profileChannel = supabase
                .channel(`user-profile-${user.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
                    (payload) => {
                        console.log('[Realtime] Profile updated:', payload.new);
                        setUser(prev => ({ ...prev, ...formatUser(payload.new) }));
                    }
                )
                .subscribe();

            // Global Presence - tracks all online users across the app
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
                .on('presence', { event: 'join', key: '*', currentPresences: [], newPresences: [] }, () => {
                    const state = globalPresenceChannel.presenceState();
                    setOnlineUserIds(new Set(Object.keys(state).map(id => String(id))));
                })
                .on('presence', { event: 'leave', key: '*', leftPresences: [], currentPresences: [] }, () => {
                    const state = globalPresenceChannel.presenceState();
                    setOnlineUserIds(new Set(Object.keys(state).map(id => String(id))));
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await globalPresenceChannel.track({
                            id: user.id,
                            name: user.name,
                            online_at: new Date().toISOString(),
                        });
                    }
                });
        }

        return () => {
            if (subscription) subscription.unsubscribe();
            if (profileChannel) supabase.removeChannel(profileChannel);
            if (globalPresenceChannel) supabase.removeChannel(globalPresenceChannel);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user?.id]);

    const checkAuth = async () => {
        console.log('[Auth] Starting checkAuth...');
        try {
            // 1. Proactively check Supabase session (standard for social redirects)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Auth] Supabase session found, syncing token...');
                localStorage.setItem('auth_token', session.access_token);
            }

            // 2. Proceed with our custom backend check
            if (authAPI.isAuthenticated()) {
                const { user: authUser, profile } = await authAPI.getMe();
                console.log('[Auth] getMe results:', !!authUser, !!profile);
                if (authUser) {
                    setUser(formatUser(profile, authUser));
                    setIsAuthenticated(true);
                }
            }
        } catch (error) {
            console.error('[Auth] checkAuth error:', error);
            // Silently handle 401/invalid token - this is expected on fresh load or expired sessions
            // Only log non-401 errors
            if (error.message && !error.message.includes('Invalid token') && !error.message.includes('401')) {
                console.error('Auth check failed:', error);
            }
            // Token might be expired, clear it
            localStorage.removeItem('auth_token');
        } finally {
            console.log('[Auth] Auth check finished. User:', user?.email, 'Authenticated:', isAuthenticated);
            setLoading(false);
        }
    };

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
            level: currentRank.id, // Level is now the Rank ID (1-12)
            exp: exp,
            gems: profile?.gems || 0,
            role: profile?.role || 'user',
            rank: currentRank.name,
            rankIcon: currentRank.icon,
            nextRank: nextRank?.name,
            pointsToNextRank: nextRank ? (nextRank.minExp - exp) : 0,
            rankProgress: progress,
            selectedHero: profile?.selected_hero || '3',
            selectedTheme: profile?.selected_theme || 'default',
            stats: {
                winnings: 0,
                losses: 0,
                winRate: "0%",
                leaderboardRank: 0
            },
            towerProgress: profile.tower_progress || {},
            isBanned: profile.is_banned || false
        };
    };

    // Register new user
    // Register new user
    const register = async (email, password, username, options = {}) => {
        const response = await authAPI.register(email, password, username, options);
        // Do not auto-login after registration (wait for email verification or manual login)
        // if (response.profile) {
        //     setUser(formatUser(response.profile));
        //     setIsAuthenticated(true);
        // }
        return response;
    };

    // Login (supports email or student_id)
    const login = async (identifier, password, useStudentId = false) => {
        const response = await authAPI.login(identifier, password, useStudentId);
        if (response.profile) {
            setUser(formatUser(response.profile));
            setIsAuthenticated(true);

            // Sync session with Supabase client (Fire and forget)
            if (response.session) {
                supabase.auth.setSession({
                    access_token: response.session.access_token,
                    refresh_token: response.session.refresh_token || ''
                }).catch(err => console.error('Session sync failed:', err));
            }
        }
        return response;
    };

    // Google Login
    const loginWithGoogle = async () => {
        try {
            await authAPI.signInWithGoogle();
            // Redirect happens automatically
        } catch (error) {
            console.error('Google login failed:', error);
            throw error;
        }
    };

    // Logout
    const logout = async () => {
        try {
            // Fire and forget - don't wait for server response to block UI
            authAPI.logout().catch(err => console.error('Logout API failed:', err));
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Immediate UI update
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('auth_token');
        }
    };

    // Update avatar
    const updateAvatar = async (file) => {
        if (!user) return;

        try {
            const response = await userAPI.updateAvatar(user.id, file);
            if (response.profile) {
                const formatted = formatUser(response.profile);
                setUser(prev => ({
                    ...prev,
                    ...formatted,
                    avatar: formatted.avatar // Explicitly ensure avatar is updated
                }));
            }
        } catch (error) {
            console.error('Failed to update avatar:', error);
            throw error;
        }
    };

    // Update profile
    const updateProfile = async (profileData) => {
        if (!user) return;

        try {
            const response = await userAPI.updateProfile(user.id, {
                username: profileData.name,
                school: profileData.school,
                college: profileData.college,
                course: profileData.course,
                student_id: profileData.student_id,
                role: profileData.role,
                email: profileData.email,
                gender: profileData.gender,
                selected_hero: profileData.selectedHero,
                selected_theme: profileData.selectedTheme
            });

            if (response.profile) {
                const formatted = formatUser(response.profile);
                setUser(prev => ({
                    ...prev,
                    ...formatted
                }));
            } else {
                setUser(prev => ({ ...prev, ...profileData, name: profileData.name }));
            }
            return response;
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    };

    // Update tower progress
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

    // Update EXP
    const updateExp = async (amount) => {
        if (!user) return;

        try {
            const response = await progressAPI.addXP(amount);
            setUser(prev => ({
                ...prev,
                exp: response.xp,
                level: response.level
            }));
            return response;
        } catch (error) {
            console.error('Failed to update XP:', error);
            throw error;
        }
    };

    // Update gems
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
        user,
        setUser,
        loading,
        isAuthenticated,
        onlineUserIds,
        register,
        login,
        loginWithGoogle,
        logout,
        updateAvatar,
        updateProfile,
        updateTowerProgress,
        updateExp,
        updateGems,
        checkAuth
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
