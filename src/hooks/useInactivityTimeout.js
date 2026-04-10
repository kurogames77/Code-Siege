import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const THROTTLE_INTERVAL = 30 * 1000; // 30 seconds

const useInactivityTimeout = () => {
    const { user, isAuthenticated, logout } = useUser();
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    const [isLoggedOutDueToInactivity, setIsLoggedOutDueToInactivity] = useState(false);

    const handleLogout = useCallback(async () => {
        await logout();
        navigate('/', { replace: true });
        setIsLoggedOutDueToInactivity(true);
    }, [logout, navigate]);

    const clearInactivity = useCallback(() => {
        setIsLoggedOutDueToInactivity(false);
    }, []);

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

    return { isLoggedOutDueToInactivity, clearInactivity };
};

export default useInactivityTimeout;
