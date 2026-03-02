import { Navigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

/**
 * ProtectedRoute
 *
 * Wraps any route that requires authentication.
 * - While auth is loading  → shows a full-screen loading spinner
 * - If not authenticated   → redirects to "/" (LandingPage)
 * - If authenticated       → renders children normally
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useUser();

    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100vw',
                    height: '100vh',
                    background: '#0f0c29',
                }}
            >
                <div
                    style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(139,92,246,0.3)',
                        borderTop: '4px solid #8b5cf6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
