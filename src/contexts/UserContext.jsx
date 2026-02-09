import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI, progressAPI } from '../services/api';
import rank1 from '../assets/rankbadges/rank1.png';
import rank2 from '../assets/rankbadges/rank2.png';
import rank3 from '../assets/rankbadges/rank3.png';
import rank4 from '../assets/rankbadges/rank4.png';
import rank5 from '../assets/rankbadges/rank5.png';
import rank6 from '../assets/rankbadges/rank6.png';
import rank7 from '../assets/rankbadges/rank7.png';
import rank8 from '../assets/rankbadges/rank8.png';
import rank9 from '../assets/rankbadges/rank9.png';
import rank10 from '../assets/rankbadges/rank10.png';
import rank11 from '../assets/rankbadges/rank11.png';
import rank12 from '../assets/rankbadges/rank12.png';
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

    useEffect(() => {
        checkAuth();

        // Dynamic Realtime Listener for the current user's profile
        let channel;
        if (user?.id) {
            channel = supabase
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
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const checkAuth = async () => {
        try {
            if (authAPI.isAuthenticated()) {
                const { user: authUser, profile } = await authAPI.getMe();
                if (profile) {
                    setUser(formatUser(profile));
                    setIsAuthenticated(true);

                    // Sync token with Supabase client for storage permissions
                    const token = localStorage.getItem('auth_token');
                    if (token) {
                        await supabase.auth.setSession({
                            access_token: token,
                            refresh_token: '' // Custom backend doesn't provide refresh token yet
                        });
                    }
                }
            }
        } catch (error) {
            // Silently handle 401/invalid token - this is expected on fresh load or expired sessions
            // Only log non-401 errors
            if (error.message && !error.message.includes('Invalid token') && !error.message.includes('401')) {
                console.error('Auth check failed:', error);
            }
            // Token might be expired, clear it
            localStorage.removeItem('auth_token');
        } finally {
            setLoading(false);
        }
    };

    // Format API user to match existing app structure
    const formatUser = (profile) => ({
        id: profile.id,
        name: profile.username,
        email: profile.email,
        studentId: profile.student_id || '',
        course: profile.course || '',
        school: profile.school || '',
        college: profile.college || '',
        avatar: profile.avatar_url,
        level: profile.level || 1,
        exp: profile.xp || 0,
        gems: profile.gems || 0,
        role: profile.role || 'student',
        selectedHero: profile.selected_hero || '3',
        selectedTheme: profile.selected_theme || 'default',
        rankName: getRankName(profile.level || 1),
        rankIcon: getRankIcon(profile.level || 1),
        stats: {
            winnings: 0,
            losses: 0,
            winRate: "0%",
            leaderboardRank: 0
        },
        towerProgress: {},
        isBanned: profile.is_banned || false
    });

    const getRankName = (level) => {
        if (level >= 50) return "SIEGE DEITY";
        if (level >= 40) return "SIEGE MASTER";
        if (level >= 30) return "SIEGE LORD";
        if (level >= 20) return "SIEGE KNIGHT";
        if (level >= 10) return "SIEGE WARRIOR";
        return "SIEGE NOVICE";
    };

    const getRankIcon = (level) => {
        if (level >= 55) return rank12;
        if (level >= 50) return rank11;
        if (level >= 45) return rank10;
        if (level >= 40) return rank9;
        if (level >= 35) return rank8;
        if (level >= 30) return rank7;
        if (level >= 25) return rank6;
        if (level >= 20) return rank5;
        if (level >= 15) return rank4;
        if (level >= 10) return rank3;
        if (level >= 5) return rank2;
        return rank1;
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
        register,
        login,
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
