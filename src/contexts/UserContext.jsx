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
            towerProgress: profile?.tower_progress || {},
            isBanned: profile?.is_banned || false
        };
    };

    const checkAuth = async () => {
        console.log('[Auth] Starting checkAuth...');
        try {
            // 1. Proactively check Supabase session (important for social redirects)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Auth] Supabase session found, syncing token...');
                localStorage.setItem('auth_token', session.access_token);
            }

            // 2. Proceed with backend check
            if (authAPI.isAuthenticated()) {
                const { user: authUser, profile } = await authAPI.getMe();
                console.log('[Auth] getMe results:', !!authUser, !!profile);
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
            localStorage.removeItem('auth_token');
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    // 1. Initial Auth Check on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // 2. Stable Auth State Listener (Social Logins)
    useEffect(() => {
        console.log('[Auth] Subscribing to onAuthStateChange');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] State change event:', event, 'Session active:', !!session);
            if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
                console.log('[Auth] Auth event detected, syncing token and re-checking profile...');
                localStorage.setItem('auth_token', session.access_token);
                await checkAuth();
            } else if (event === 'SIGNED_OUT') {
                console.log('[Auth] SIGNED_OUT detected');
                setUser(null);
                setIsAuthenticated(false);
                localStorage.removeItem('auth_token');
            }
        });

        return () => {
            console.log('[Auth] Unsubscribing from onAuthStateChange');
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
                        console.log('[Realtime] Profile updated:', payload.new);
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
            if (profileChannel) supabase.removeChannel(profileChannel);
            if (globalPresenceChannel) supabase.removeChannel(globalPresenceChannel);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user?.id]);

    const register = async (email, password, username, options = {}) => {
        return await authAPI.register(email, password, username, options);
    };

    const login = async (identifier, password, useStudentId = false) => {
        const response = await authAPI.login(identifier, password, useStudentId);
        if (response.profile) {
            setUser(formatUser(response.profile));
            setIsAuthenticated(true);
            if (response.session) {
                localStorage.setItem('auth_token', response.session.access_token);
                supabase.auth.setSession({
                    access_token: response.session.access_token,
                    refresh_token: response.session.refresh_token || ''
                }).catch(err => console.error('Session sync failed:', err));
            }
        }
        return response;
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
        try {
            authAPI.logout().catch(err => console.error('Logout API failed:', err));
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('auth_token');
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
                selected_theme: profileData.selectedTheme
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
