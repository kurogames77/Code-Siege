import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ChevronLeft, Shield } from 'lucide-react';
import supabase from '../lib/supabase';
import '../styles/landing-page.css';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState(false);

    // Wait for Supabase to detect the recovery session from the URL hash
    useEffect(() => {
        // Set flags so UserContext doesn't interfere with the recovery session
        localStorage.removeItem('code_siege_logged_out');
        localStorage.setItem('code_siege_resetting_password', 'true');

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setSessionReady(true);
                // Hide the access token from the URL immediately
                window.history.replaceState(null, '', window.location.pathname);
            } else if (event === 'SIGNED_IN' && session) {
                setSessionReady(true);
                window.history.replaceState(null, '', window.location.pathname);
            }
        });

        // Also check if session already exists (e.g. if page was refreshed after hash was cleared)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setSessionReady(true);
                if (window.location.hash) {
                    window.history.replaceState(null, '', window.location.pathname);
                }
            } else {
                // Give Supabase a moment to process the hash token
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (retrySession) {
                        setSessionReady(true);
                        window.history.replaceState(null, '', window.location.pathname);
                    } else {
                        setSessionError(true);
                    }
                }, 4000);
            }
        };

        checkSession();

        return () => subscription?.unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                setError(updateError.message || 'Failed to update password. Please try again.');
                return;
            }

            setSuccess(true);

            // Clean up: clear the resetting flag, sign out, and remove tokens
            localStorage.removeItem('code_siege_resetting_password');
            localStorage.setItem('code_siege_logged_out', 'true');
            localStorage.removeItem('auth_token');
            setTimeout(async () => {
                try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) { }
            }, 500);
        } catch (err) {
            console.error('Password update failed:', err);
            setError('Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReturnLogin = () => {
        localStorage.removeItem('code_siege_resetting_password');
        localStorage.setItem('code_siege_logged_out', 'true');
        localStorage.removeItem('auth_token');
        navigate('/', { state: { openLogin: true } });
    };

    // Session error state - link expired or invalid
    if (sessionError && !sessionReady) {
        return (
            <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="landing-modal__panel" style={{ maxWidth: '420px', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '12px 8px' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '16px', color: '#f87171'
                        }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{
                            margin: '0 0 8px', fontSize: '18px', fontWeight: 700,
                            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5edff'
                        }}>Link Expired</h3>
                        <p style={{
                            fontSize: '12px', color: 'rgba(205, 187, 255, 0.55)',
                            lineHeight: 1.6, margin: '0 0 20px'
                        }}>
                            This password reset link has expired or is invalid. Please request a new one from the login page.
                        </p>
                        <button
                            type="button"
                            className="landing-modal__submit"
                            style={{ width: '100%' }}
                            onClick={handleReturnLogin}
                        >
                            Return to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading session state
    if (!sessionReady) {
        return (
            <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'rgba(186, 160, 255, 0.9)' }} />
                    <p style={{ fontSize: '12px', color: 'rgba(205, 187, 255, 0.5)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                        Verifying reset link...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="landing-modal__panel" style={{ maxWidth: '420px', width: '100%' }}>

                {success ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '12px 8px' }}>
                        <div className="landing-modal__forgot-success-icon">
                            <CheckCircle size={32} />
                        </div>
                        <h3 style={{
                            margin: '0 0 8px', fontSize: '18px', fontWeight: 700,
                            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5edff'
                        }}>Password Updated!</h3>
                        <p style={{
                            fontSize: '12px', color: 'rgba(205, 187, 255, 0.55)',
                            lineHeight: 1.6, margin: '0 0 20px'
                        }}>
                            Your password has been successfully changed. You can now log in with your new password.
                        </p>
                        <button
                            type="button"
                            className="landing-modal__submit"
                            style={{ width: '100%' }}
                            onClick={handleReturnLogin}
                        >
                            Return to Login
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="landing-modal__header">
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'rgba(138, 95, 240, 0.12)', border: '1px solid rgba(138, 95, 240, 0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '12px', color: 'rgba(186, 160, 255, 0.9)'
                            }}>
                                <Shield size={28} />
                            </div>
                            <div className="landing-modal__heading">
                                <h2>Set New Password</h2>
                            </div>
                            <p className="landing-modal__forgot-subtitle">
                                Enter your new password below. Make sure it's at least 6 characters long.
                            </p>
                        </div>

                        {error && (
                            <div className="landing-modal__error">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <form className="landing-modal__form" onSubmit={handleSubmit}>
                            <label className="landing-modal__field">
                                <span className="landing-modal__label">New Password</span>
                                <div className="landing-modal__input">
                                    <Lock />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        placeholder="Enter new password (min 6 chars)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        minLength={6}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="p-1 hover:text-white text-slate-400 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </label>

                            <label className="landing-modal__field">
                                <span className="landing-modal__label">Confirm Password</span>
                                <div className="landing-modal__input">
                                    <Lock />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        placeholder="Confirm your new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="p-1 hover:text-white text-slate-400 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </label>

                            <button className="landing-modal__submit" type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Updating Password...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </form>

                        <div className="landing-modal__footnote">
                            <button type="button" onClick={handleReturnLogin}>
                                <ChevronLeft size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                Back to Login
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
