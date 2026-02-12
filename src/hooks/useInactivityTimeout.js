import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const THROTTLE_INTERVAL = 30 * 1000; // 30 seconds

const useInactivityTimeout = () => {
    const { user, isAuthenticated, logout } = useUser();
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    const handleLogout = useCallback(async () => {
        await logout();
        navigate('/', { replace: true });
        // Small delay to ensure navigation completes before alert
        setTimeout(() => {
            alert('You have been logged out due to inactivity.');
        }, 100);
    }, [logout, navigate]);

    const resetTimer = useCallback(() => {
        const now = Date.now();

        // Throttle: only reset if enough time has passed since last reset
        if (now - lastActivityRef.current < THROTTLE_INTERVAL) return;
        lastActivityRef.current = now;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    }, [handleLogout]);

    useEffect(() => {
        // Only activate for authenticated non-admin users
        if (!isAuthenticated || !user || user.role === 'admin') {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

        // Start the initial timer
        lastActivityRef.current = Date.now();
        timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [isAuthenticated, user, resetTimer, handleLogout]);
};

export default useInactivityTimeout;
