import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, GraduationCap, User, Mail, Lock, BookOpen, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff, Trophy, Swords, Users, Castle, X, CheckCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import '../styles/landing-page.css';
import { authAPI } from '../services/api';
import supabase from '../lib/supabase';
import nameImage from '../assets/name.png';
import gameIcon from '../assets/icongame.png';
import towerIcon from '../assets/tower11.png';
import heroesIcon from '../assets/heroes.png';
import battleIcon from '../assets/doorbattle.png';
import rankingIcon from '../assets/ranking.png';
import leaderboardIcon from '../assets/leaderboard.png';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, loginWithGoogle, isAuthenticated, user, updateProfile } = useUser();
    const toast = useToast();

    const [modal, setModal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [signupSuccess, setSignupSuccess] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [instructorId, setInstructorId] = useState('');
    const [course, setCourse] = useState('');
    const [instructorCode, setInstructorCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Map student code prefix to course (CS→BSCS, IS→BSIS, IT→BSIT)
    const CODE_PREFIX_TO_COURSE = { 'CS': 'BSCS', 'IS': 'BSIS', 'IT': 'BSIT' };
    const ALL_COURSES = ['BSCS', 'BSIS', 'BSIT'];

    // Derive the detected course from the student code prefix
    const detectedCoursePrefix = instructorCode.trim().split('-')[0]?.toUpperCase() || '';
    const detectedCourse = CODE_PREFIX_TO_COURSE[detectedCoursePrefix] || null;

    // Auto-select the course when a valid student code prefix is detected
    useEffect(() => {
        if (detectedCourse) {
            setCourse(detectedCourse);
        }
    }, [detectedCourse]);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [forgotError, setForgotError] = useState('');

    // Policy state
    const [acceptPolicy, setAcceptPolicy] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    const openSignup = (role = 'student') => {
        setModal({ type: 'signup', role });
        setSignupSuccess(false);
        resetForm();
        setAcceptPolicy(false); // Reset policy acceptance
    };

    useEffect(() => {
        // Force scroll to top on mount
        window.scrollTo(0, 0);

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const openLogin = (role = 'student') => {
        setModal({ type: 'login', role });
        resetForm();
    };

    const closeModal = () => {
        setModal(null);
        resetForm();
    };

    const updateRole = (role) => {
        setError('');
        setStudentId('');
        setInstructorId('');
        setPassword('');
        setEmail('');
        setFullName('');
        setCourse('');
        setInstructorCode('');
        setSignupSuccess(false);
        setAcceptPolicy(false); // Reset policy acceptance on role change
        setModal((prev) => (prev ? { ...prev, role } : prev));
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setFullName('');
        setStudentId('');
        setInstructorId('');
        setCourse('');
        setInstructorCode('');
        setError('');
        setShowPassword(false);
        setAcceptPolicy(false); // Reset policy acceptance
        setShowForgotPassword(false);
        setForgotEmail('');
        setForgotMaskedEmail('');
        setForgotLoading(false);
        setForgotSuccess(false);
        setForgotError('');
    };

    // Interceptor for Google Login to save intended role
    // This persists the selected role so that after the Google OAuth redirect,
    // the complete_profile form knows which role to lock to and hides irrelevant tabs.
    const handleGoogleLogin = () => {
        if (modal?.role) {
            localStorage.setItem('code_siege_intended_role', modal.role);
        } else {
            localStorage.removeItem('code_siege_intended_role');
        }
        loginWithGoogle();
    };

    useEffect(() => {
        if (location.state?.openLogin) {
            openLogin();
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        if (location.hash) {
            // Handle Supabase error hashes (e.g. expired/invalid reset links)
            if (location.hash.includes('error=')) {
                const hashParams = new URLSearchParams(location.hash.substring(1));
                const errorDesc = hashParams.get('error_description') || '';
                const errorCode = hashParams.get('error_code') || '';

                let message = 'Something went wrong. Please try again.';
                if (errorCode === 'otp_expired' || errorDesc.toLowerCase().includes('expired')) {
                    message = 'This reset link has expired or was already used. Please request a new one.';
                } else if (errorDesc) {
                    message = errorDesc.replace(/\+/g, ' ');
                }

                toast.error(message);
                // Clear the error hash from URL
                window.history.replaceState(null, '', window.location.pathname);
                return;
            }

            const isRecovery = location.hash.includes('type=recovery') ||
                location.hash.includes('type=initial_recovery');

            const isMagicLink = location.hash.includes('type=signup') ||
                location.hash.includes('type=invite');

            if (isRecovery) {
                // Clear logged-out flag and set resetting flag so UserContext doesn't interfere
                localStorage.removeItem('code_siege_logged_out');
                localStorage.setItem('code_siege_resetting_password', 'true');
                // Navigate with hash so ResetPasswordPage can process the token
                navigate('/reset-password' + location.hash, { replace: true });
            } else if (isMagicLink) {
                // Pass the hash so Supabase can parse the access_token and replace any stale sessions
                navigate('/ConfirmationPage' + location.hash, { replace: true });
            }
        }
    }, [location, navigate]);

    // Check for logout state and handle redirect logic
    useEffect(() => {
        // First check: Did we just log out?
        if (location.state?.loggedOut) {
            toast.success('Logged out successfully');
            // Force scroll to top
            window.scrollTo(0, 0);
            // Clear state to prevent showing again on refresh
            window.history.replaceState({}, document.title);
            return; // STOP here. Do not process isAuthenticated redirects.
        }

        // Redirect if already authenticated — but NOT right after a logout
        if (isAuthenticated && user) {

            // Guard: If the URL has a Supabase hash (email confirmation, recovery, etc.),
            // let the hash-handling useEffect process it instead of redirecting here.
            // Without this, an existing session (e.g., instructor) would immediately
            // navigate to its dashboard, hijacking the confirmation/recovery flow.
            if (location.hash && (
                location.hash.includes('type=signup') ||
                location.hash.includes('type=invite') ||
                location.hash.includes('type=recovery') ||
                location.hash.includes('type=initial_recovery') ||
                location.hash.includes('error=')
            )) {
                return; // Let the hash useEffect handle it
            }
            
            // 1. Check for intended guest Google login
            const intendedRole = localStorage.getItem('code_siege_intended_role');
            if (intendedRole === 'guest' && user.role !== 'guest' && !user.studentId) {
                // Show the complete profile modal locked to the guest role
                if (modal?.type !== 'complete_profile') {
                    setModal({ type: 'complete_profile', role: 'guest', isGuestLocked: true });
                    setFullName(user.name || user.username || '');
                }
                return; // Wait for user to complete the form
            }

            // 2. Check for intended instructor Google login
            if (intendedRole === 'instructor' && user.role !== 'instructor' && !user.instructorId) {
                // Show the complete profile modal locked to the instructor role only
                if (modal?.type !== 'complete_profile') {
                    setModal({ type: 'complete_profile', role: 'instructor', isInstructorLocked: true });
                    setFullName(user.name || user.username || '');
                }
                return; // Wait for user to complete the form
            }

            // 3. Check for intended student Google login
            if (intendedRole === 'student' && !user.studentId) {
                // Show the complete profile modal locked to the student role only
                if (modal?.type !== 'complete_profile') {
                    setModal({ type: 'complete_profile', role: 'student', isStudentLocked: true });
                    setFullName(user.name || user.username || '');
                }
                return; // Wait for user to complete the form
            }

            // 4. Normal Complete Profile Check (social login for users missing studentId, no intended role)
            // Instructors/admins/guests don't need to complete profile
            if (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'guest' && !user.studentId) {
                if (modal?.type !== 'complete_profile') {
                    setModal({ type: 'complete_profile', role: (user.role === 'user' || !user.role) ? 'student' : user.role });
                    // Initialize fullName from user metadata/current name so they can fix it if "wrong"
                    setFullName(user.name || '');
                }
                return;
            }

            if (location.state?.returnUrl) {
                navigate(location.state.returnUrl);
                return;
            }

            if (user.role === 'admin') {
                navigate('/admin');
            } else if (user.role === 'instructor') {
                navigate('/instructor');
            } else {
                // 'student', 'user', 'guest' all go to /play
                navigate('/play');
            }
        }
    }, [isAuthenticated, user, navigate, location.state]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (modal?.type === 'signup') {
                // Register
                if (!fullName.trim()) {
                    throw new Error('Please enter your full name');
                }
                if (!email.trim()) {
                    throw new Error('Please enter your email');
                }
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                if (!acceptPolicy) {
                    throw new Error('You must accept the Terms of Service & Privacy Policy.');
                }

                const isGuest = modal?.role === 'guest';
                const response = await register(email.trim(), password, fullName, {
                    student_id: isGuest ? `GUEST-${Date.now()}` : (modal?.role === 'student' ? studentId : instructorId).trim(),
                    course: isGuest ? 'GUEST' : course,
                    role: isGuest ? 'guest' : modal?.role,
                    student_code: modal?.role === 'student' ? instructorCode.trim() : undefined
                });

                // Show success message or close modal depending on role
                setError(''); // clear any errors
                setLoading(false);

                if (response?.applicationPending) {
                    toast.success('Application submitted! Please wait for the admin to send verification through gmail.');
                    closeModal(); // Close immediately for instructors
                } else {
                    setSignupSuccess(true); // Show 'Check Your Email' panel for students
                }
            } else {
                // Login
                const isGuestLogin = modal?.role === 'guest';
                const isStudentTab = modal?.role === 'student';
                const idToSubmit = isGuestLogin ? email.trim() : (isStudentTab ? studentId.trim() : instructorId.trim());

                if (!idToSubmit) {
                    throw new Error(isGuestLogin ? 'Please enter your email' : `Please enter your ${isStudentTab ? 'Student' : 'Instructor'} ID`);
                }
                if (!password.trim()) {
                    throw new Error('Please enter your password');
                }

                // Call login with the provided ID and the expected role (the current tab)
                const expectedRole = modal?.role || 'student';
                const useStudentIdFlag = !isGuestLogin; // Guests login with email, not student_id
                const response = await login(idToSubmit, password, useStudentIdFlag, expectedRole);
                toast.success('Welcome back!');
                closeModal();

                // Explicitly navigate based on the ACTUAL role returned from the database,
                // regardless of which tab the user used to log in.
                const actualRole = response?.profile?.role || 'user';
                if (actualRole === 'admin') {
                    navigate('/admin');
                } else if (actualRole === 'instructor') {
                    navigate('/instructor');
                } else {
                    navigate('/play');
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteProfile = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const role = modal?.role || 'student';
            const id = role !== 'guest' ? (role === 'student' ? studentId : instructorId).trim() : '';

            if (!id && role !== 'guest') {
                throw new Error(`Please enter your ${role === 'student' ? 'Student' : 'Instructor'} ID`);
            }

            if (role === 'student' && !course) {
                throw new Error('Please select your course');
            }

            if (!password || password.length < 6) {
                throw new Error('Please enter a password of at least 6 characters');
            }

            const profileData = {
                role: role,
                username: fullName.trim(),
            };

            if (role === 'guest') {
                profileData.student_id = `GUEST-${Date.now()}`;
                profileData.course = 'GUEST';
            } else {
                profileData.student_id = id;
                profileData.course = course;
                profileData.student_code = role === 'student' ? instructorCode.trim() : undefined;
            }

            await updateProfile(profileData);

            if (password) {
                const { error: passwordError } = await supabase.auth.updateUser({ password });
                if (passwordError) {
                    throw new Error('Profile saved, but failed to set password: ' + (passwordError.message || passwordError));
                }
            }

            // Clear intended role from localStorage now that profile is saved
            localStorage.removeItem('code_siege_intended_role');

            toast.success('Profile completed! Welcome to Code Siege.');
            closeModal();
            // Navigation will be handled by the useEffect
        } catch (err) {
            console.error('Profile completion error:', err);
            setError(err.message || 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNameInput = (event) => {
        const value = event.target.value;
        const words = value.split(' ');
        const capitalized = words.map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
        setFullName(capitalized);
    };

    const isLogin = modal?.type === 'login';

    return (
        <div className="landing-page">
            <header className="landing-header">
                <img
                    src={nameImage}
                    alt="Code Siege"
                    className="header-logo"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
                <nav className="landing-nav">
                    <button className="nav-link primary" type="button" onClick={() => openSignup(modal?.role ?? 'student')}>
                        Start Now
                    </button>
                    <a className="nav-link" href="#about">
                        About
                    </a>
                    <button className="nav-link" type="button" onClick={() => openLogin(modal?.role ?? 'student')}>
                        Login
                    </button>
                </nav>
            </header>

            <section className="landing-hero">
                <div className="hero-content">

                    <h1 className="hero-title">
                        <span className="hero-title-line">LEARN TO CODE</span>
                        <span className="hero-title-line">BY <span className="accent">CONQUERING</span></span>
                        <span className="hero-title-line accent">TOWERS</span>
                    </h1>

                    <div className="hero-buttons">
                        <button className="hero-btn" type="button" onClick={() => openSignup('instructor')}>
                            I'm an Instructor
                        </button>
                        <button className="hero-btn" type="button" onClick={() => openSignup('student')}>
                            I'm a Student
                        </button>
                        <button className="hero-btn" type="button" onClick={() => openSignup('guest')} style={{ opacity: 0.85 }}>
                            Play as Guest
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section (About) — Animated */}
            <AboutSection towerIcon={towerIcon} heroesIcon={heroesIcon} battleIcon={battleIcon} rankingIcon={rankingIcon} leaderboardIcon={leaderboardIcon} />

            {modal?.type === 'signup' && (
                <div className="landing-modal" role="dialog" aria-modal="true" aria-labelledby="signup-title">
                    <div className="landing-modal__panel landing-modal__panel--signup">
                        <button className="landing-modal__back" type="button" onClick={closeModal}>
                            <ChevronLeft className="landing-modal__back-icon" />
                            Back
                        </button>
                        <div className="landing-modal__header" id="signup-title">
                            <div className="landing-modal__heading">
                                <h2>{signupSuccess ? 'Check Your Email' : 'Join the Siege'}</h2>
                            </div>
                        </div>

                        {signupSuccess ? (
                            <div className="flex flex-col items-center text-center p-6 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 text-blue-400">
                                    <Mail size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Verification Sent</h3>
                                <p className="text-slate-400 mb-6">
                                    We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                                    Please check your inbox to activate your account before logging in.
                                </p>
                                <button
                                    type="button"
                                    className="landing-modal__submit"
                                    onClick={closeModal}
                                >
                                    Got it
                                </button>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="landing-modal__error">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <form className="landing-modal__form" onSubmit={handleSubmit}>
                                    {modal.role !== 'guest' && (
                                        <label className="landing-modal__field">
                                            <span className="landing-modal__label">{modal.role === 'student' ? 'Student ID' : 'Instructor ID'}</span>
                                            <div className="landing-modal__input">
                                                <User />
                                                <input
                                                    type="text"
                                                    placeholder={modal.role === 'student' ? 'Enter your student ID' : 'Enter your instructor ID'}
                                                    value={modal.role === 'student' ? studentId : instructorId}
                                                    onChange={(e) => modal.role === 'student' ? setStudentId(e.target.value) : setInstructorId(e.target.value)}
                                                />
                                            </div>
                                        </label>
                                    )}

                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Full Name</span>
                                        <div className="landing-modal__input">
                                            <User />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Enter your full name"
                                                value={fullName}
                                                onChange={(e) => handleNameInput(e)}
                                            />
                                        </div>
                                    </label>

                                    {modal.role === 'student' && (
                                        <label className="landing-modal__field">
                                            <span className="landing-modal__label">Student Code</span>
                                            <div className="landing-modal__input">
                                                <Shield />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Enter your student code"
                                                    value={instructorCode}
                                                    onChange={(e) => setInstructorCode(e.target.value)}
                                                />
                                            </div>
                                        </label>
                                    )}

                                    {modal.role === 'student' && (
                                        <label className="landing-modal__field">
                                            <span className="landing-modal__label">Course</span>
                                            <div className="landing-modal__input">
                                                <BookOpen />
                                                <select
                                                    value={course}
                                                    onChange={(e) => setCourse(e.target.value)}
                                                >
                                                    <option value="" disabled>Select your course</option>
                                                    {ALL_COURSES.map(c => (
                                                        <option
                                                            key={c}
                                                            value={c}
                                                            disabled={detectedCourse && c !== detectedCourse}
                                                        >
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </label>
                                    )}

                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Email</span>
                                        <div className="landing-modal__input">
                                            <Mail />
                                            <input
                                                type="email"
                                                required
                                                placeholder="yourname@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </label>

                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Password</span>
                                        <div className="landing-modal__input">
                                            <Lock />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                placeholder="Enter your password (min 6 chars)"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="p-1 hover:text-white text-slate-400 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </label>

                                        {/* Policy Checkbox (Only for Registration) */}
                                        {!isLogin && (
                                            <div className="landing-modal__policy-field mt-4 flex items-start gap-3 group">
                                                <label className="relative flex items-center justify-center mt-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={acceptPolicy}
                                                        onChange={(e) => setAcceptPolicy(e.target.checked)}
                                                    />
                                                    <div className="w-5 h-5 border-2 rounded border-slate-600 bg-slate-900/50 peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors flex items-center justify-center group-hover:border-purple-400">
                                                        <CheckCircle2 className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${acceptPolicy ? 'scale-100' : 'scale-0'}`} />
                                                    </div>
                                                </label>
                                                <div className="text-xs text-slate-400 leading-tight">
                                                    I have read and agree to the{' '}
                                                    <button
                                                        type="button"
                                                        className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors focus:outline-none relative z-10 inline-block"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setShowPolicyModal(true);
                                                        }}
                                                    >
                                                        Terms of Service & Privacy Policy
                                                    </button>
                                                    , and I consent to the collection and use of my ID, Name, and Email.
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            className="landing-modal__submit"
                                            type="submit"
                                            disabled={loading || (!isLogin && !acceptPolicy)}
                                        >
                                        {loading ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="animate-spin" size={18} />
                                                Creating Account...
                                            </div>
                                        ) : (
                                            'Create Account'
                                        )}
                                    </button>

                                    <div className="landing-modal__divider">
                                        <span>OR</span>
                                    </div>

                                    <button
                                        type="button"
                                        className="landing-modal__google"
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                            />
                                        </svg>
                                        Continue with Google
                                    </button>
                                </form>

                                <div className="landing-modal__footnote">
                                    <span>Already have an account?</span>
                                    <button type="button" onClick={() => openLogin(modal.role)}>
                                        Login
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {
                modal?.type === 'login' && (
                    <div className="landing-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
                        <div className="landing-modal__panel landing-modal__panel--login">
                            <button className="landing-modal__back" type="button" onClick={closeModal}>
                                <ChevronLeft className="landing-modal__back-icon" />
                                Back
                            </button>
                            <div className="landing-modal__header" id="login-title">
                                <div className="landing-modal__heading">
                                    <h2>Welcome Back, Knight</h2>
                                </div>
                            </div>

                            <div className="landing-modal__roles landing-modal__roles--compact" role="radiogroup" aria-label="Select role">
                                <button
                                    type="button"
                                    className={`landing-modal__role ${modal.role === 'student' ? 'is-active' : ''}`}
                                    onClick={() => updateRole('student')}
                                >
                                    <GraduationCap />
                                    Student
                                </button>
                                <button
                                    type="button"
                                    className={`landing-modal__role ${modal.role === 'instructor' ? 'is-active' : ''}`}
                                    onClick={() => updateRole('instructor')}
                                >
                                    <User />
                                    Instructor
                                </button>
                                <button
                                    type="button"
                                    className={`landing-modal__role ${modal.role === 'guest' ? 'is-active' : ''}`}
                                    onClick={() => updateRole('guest')}
                                >
                                    <Shield />
                                    Guest
                                </button>
                            </div>

                            {error && (
                                <div className="landing-modal__error">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <form className="landing-modal__form" onSubmit={handleSubmit}>
                                {modal.role === 'guest' ? (
                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Email</span>
                                        <div className="landing-modal__input">
                                            <Mail />
                                            <input
                                                type="email"
                                                required
                                                autoComplete="email"
                                                placeholder="Enter your email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </label>
                                ) : modal.role === 'student' ? (
                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Student ID</span>
                                        <div className="landing-modal__input">
                                            <User />
                                            <input
                                                type="text"
                                                required
                                                autoComplete="username"
                                                placeholder="Enter your Student ID"
                                                value={studentId}
                                                onChange={(e) => setStudentId(e.target.value)}
                                            />
                                        </div>
                                    </label>
                                ) : (
                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Instructor ID</span>
                                        <div className="landing-modal__input">
                                            <User />
                                            <input
                                                type="text"
                                                required
                                                autoComplete="username"
                                                placeholder="Enter your Instructor ID"
                                                value={instructorId}
                                                onChange={(e) => setInstructorId(e.target.value)}
                                            />
                                        </div>
                                    </label>
                                )}

                                <label className="landing-modal__field">
                                    <span className="landing-modal__label">Password</span>
                                    <div className="landing-modal__input">
                                        <Lock />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            autoComplete="current-password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="p-1 hover:text-white text-slate-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </label>

                                        {/* Policy Checkbox (Only for Registration) */}
                                        {!isLogin && (
                                            <div className="landing-modal__policy-field mt-4 flex items-start gap-3 group">
                                                <label className="relative flex items-center justify-center mt-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={acceptPolicy}
                                                        onChange={(e) => setAcceptPolicy(e.target.checked)}
                                                    />
                                                    <div className="w-5 h-5 border-2 rounded border-slate-600 bg-slate-900/50 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-colors flex items-center justify-center group-hover:border-cyan-400">
                                                        <CheckCircle2 className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${acceptPolicy ? 'scale-100' : 'scale-0'}`} />
                                                    </div>
                                                </label>
                                                <div className="text-xs text-slate-400 leading-tight">
                                                    I have read and agree to the{' '}
                                                    <button
                                                        type="button"
                                                        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors focus:outline-none relative z-10 inline-block"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setShowPolicyModal(true);
                                                        }}
                                                    >
                                                        Terms of Service & Privacy Policy
                                                    </button>
                                                    , and I consent to the collection and use of my ID, Name, and Email.
                                                </div>
                                            </div>
                                        )}

                                <div className="landing-modal__forgot">
                                    <button
                                        type="button"
                                        className="landing-modal__forgot-link"
                                        onClick={() => {
                                            const currentId = modal?.role === 'instructor' ? instructorId : studentId;
                                            if (!currentId || !currentId.trim()) {
                                                setError(`Please enter your ${modal?.role === 'instructor' ? 'Instructor' : 'Student'} ID first.`);
                                                return;
                                            }
                                            setError('');
                                            setShowForgotPassword(true);
                                            setForgotError('');
                                            setForgotSuccess(false);
                                            setForgotEmail('');
                                            setForgotMaskedEmail('');
                                        }}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <button className="landing-modal__submit" type="submit" disabled={loading}>
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="animate-spin" size={18} />
                                            Authenticating...
                                        </div>
                                    ) : (
                                        'Login'
                                    )}
                                </button>

                                <div className="landing-modal__divider">
                                    <span>OR</span>
                                </div>

                                <button
                                    type="button"
                                    className="landing-modal__google"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                        />
                                    </svg>
                                    Continue with Google
                                </button>
                            </form>

                            <div className="landing-modal__footnote">
                                <span>Need a new account?</span>
                                <button type="button" onClick={() => openSignup(modal.role)}>
                                    Sign Up
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Forgot Password Popup */}
            {showForgotPassword && (
                <div className="landing-modal landing-modal--forgot" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
                    <div className="landing-modal__panel landing-modal__panel--forgot">
                        <button
                            className="landing-modal__forgot-close"
                            type="button"
                            onClick={() => setShowForgotPassword(false)}
                        >
                            <X size={18} />
                        </button>

                        {forgotSuccess ? (
                            <div className="landing-modal__forgot-success">
                                <div className="landing-modal__forgot-success-icon">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 id="forgot-password-title">Check Your Email</h3>
                                <p>
                                    We've sent a password reset link to <strong>{forgotMaskedEmail}</strong>.
                                    Please check your inbox and follow the instructions to reset your password.
                                </p>
                                <button
                                    type="button"
                                    className="landing-modal__submit"
                                    onClick={() => setShowForgotPassword(false)}
                                >
                                    Got it
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="landing-modal__header" id="forgot-password-title">
                                    <div className="landing-modal__heading">
                                        <h2>Reset Password</h2>
                                    </div>
                                    <p className="landing-modal__forgot-subtitle">
                                        Enter the email address associated with your account and we'll send you a link to reset your password.
                                    </p>
                                </div>

                                {forgotError && (
                                    <div className="landing-modal__error">
                                        <AlertCircle size={16} />
                                        {forgotError}
                                    </div>
                                )}

                                <form
                                    className="landing-modal__form"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setForgotError('');
                                        if (!forgotEmail.trim()) {
                                            setForgotError('Please enter your email address.');
                                            return;
                                        }
                                        const currentId = modal?.role === 'instructor' ? instructorId : studentId;
                                        setForgotLoading(true);
                                        try {
                                            const result = await authAPI.forgotPassword(currentId.trim(), forgotEmail.trim());
                                            setForgotMaskedEmail(forgotEmail.trim());
                                            setForgotSuccess(true);
                                        } catch (err) {
                                            console.error('Password reset failed:', err);
                                            setForgotError(err.message || 'Failed to send reset email. Please try again.');
                                        } finally {
                                            setForgotLoading(false);
                                        }
                                    }}
                                >
                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Email Address</span>
                                        <div className="landing-modal__input">
                                            <Mail />
                                            <input
                                                type="email"
                                                required
                                                placeholder="yourname@email.com"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </label>

                                    <button className="landing-modal__submit" type="submit" disabled={forgotLoading}>
                                        {forgotLoading ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="animate-spin" size={18} />
                                                Sending...
                                            </div>
                                        ) : (
                                            'Send Reset Link'
                                        )}
                                    </button>
                                </form>

                                <div className="landing-modal__footnote">
                                    <span>Remember your password?</span>
                                    <button type="button" onClick={() => setShowForgotPassword(false)}>
                                        Back to Login
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {modal?.type === 'complete_profile' && (
                <div className="landing-modal" role="dialog" aria-modal="true" aria-labelledby="complete-profile-title">
                    <div className="landing-modal__panel landing-modal__panel--signup">
                        <div className="landing-modal__header" id="complete-profile-title">
                            <div className="landing-modal__heading">
                                <h2>Complete Your Profile</h2>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 text-center">
                                One last step before you enter the siege
                            </p>
                        </div>

                        {/* Role Tabs: hidden when locked to a specific role via Google signup */}
                        {!modal.isGuestLocked && !modal.isInstructorLocked && !modal.isStudentLocked && (
                            <div className="landing-modal__roles" role="radiogroup" aria-label="Select role">
                                <button
                                    type="button"
                                    className={`landing-modal__role ${modal.role === 'student' ? 'is-active' : ''}`}
                                    onClick={() => updateRole('student')}
                                >
                                    <GraduationCap />
                                    Student
                                </button>
                                <button
                                    type="button"
                                    className={`landing-modal__role ${modal.role === 'instructor' ? 'is-active' : ''}`}
                                    onClick={() => updateRole('instructor')}
                                >
                                    <User />
                                    Instructor
                                </button>
                                <button
                                    type="button"
                                    className={`landing-modal__role ${modal.role === 'guest' ? 'is-active' : ''}`}
                                    onClick={() => updateRole('guest')}
                                >
                                    <Shield />
                                    Guest
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="landing-modal__error">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <form className="landing-modal__form" onSubmit={handleCompleteProfile}>
                            <label className="landing-modal__field">
                                <span className="landing-modal__label">Full Name</span>
                                <div className="landing-modal__input">
                                    <User />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter your full name"
                                        value={fullName}
                                        onChange={handleNameInput}
                                    />
                                </div>
                            </label>

                            {modal.role !== 'guest' && (
                                <label className="landing-modal__field">
                                    <span className="landing-modal__label">{modal.role === 'student' ? 'Student ID' : 'Instructor ID'}</span>
                                    <div className="landing-modal__input">
                                        <User />
                                        <input
                                            type="text"
                                            required
                                            placeholder={modal.role === 'student' ? 'Enter your student ID' : 'Enter your instructor ID'}
                                            value={modal.role === 'student' ? studentId : instructorId}
                                            onChange={(e) => modal.role === 'student' ? setStudentId(e.target.value) : setInstructorId(e.target.value)}
                                        />
                                    </div>
                                </label>
                            )}

                            {modal.role === 'student' && (
                                <label className="landing-modal__field">
                                    <span className="landing-modal__label">Student Code</span>
                                    <div className="landing-modal__input">
                                        <KeyRound />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter your student code"
                                            value={instructorCode}
                                            onChange={(e) => setInstructorCode(e.target.value)}
                                        />
                                    </div>
                                </label>
                            )}

                            {modal.role === 'student' && (
                                <label className="landing-modal__field">
                                    <span className="landing-modal__label">Course</span>
                                    <div className="landing-modal__input">
                                        <BookOpen />
                                        <select
                                            required
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                        >
                                            <option value="" disabled>Select your course</option>
                                            {ALL_COURSES.map(c => (
                                                <option
                                                    key={c}
                                                    value={c}
                                                    disabled={detectedCourse && c !== detectedCourse}
                                                >
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </label>
                            )}

                            <label className="landing-modal__field">
                                <span className="landing-modal__label">Password</span>
                                <div className="landing-modal__input">
                                    <Lock />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="Set your password (min 6 chars)"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="p-1 hover:text-white text-slate-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </label>

                            <button className="landing-modal__submit" type="submit" disabled={loading}>
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" size={18} />
                                        Saving Profile...
                                    </div>
                                ) : (
                                    'Complete Registration'
                                )}
                            </button>
                        </form>

                        <div className="landing-modal__footnote mt-6">
                            <span>Register as </span>
                            <span className="text-white font-bold ml-1">{user.email}</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Policy Modal */}
            {showPolicyModal && (
                <div className="landing-modal landing-modal--policy" role="dialog" aria-modal="true" aria-labelledby="policy-title">
                    <div className="landing-modal__panel landing-modal__panel--policy">
                        <button
                            className="landing-modal__policy-close"
                            type="button"
                            onClick={() => setShowPolicyModal(false)}
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="landing-modal__policy-content">
                            <h2 id="policy-title" className="policy-main-title">Terms of Service & Privacy Policy</h2>
                            <p className="policy-intro">
                                Welcome to Code Siege. We are committed to protecting your data and respecting your privacy while you conquer the abstract realms. This policy outlines how we collect and use your information.
                            </p>

                            <hr className="policy-divider" />

                            <div className="policy-section">
                                <div className="policy-section-header">
                                    <Shield className="policy-icon" size={24} />
                                    <h3>Our role in your privacy</h3>
                                </div>
                                <p>
                                    If you are a student or instructor registering for Code Siege, this policy applies to you. We act as the data controller for the information you provide during registration and gameplay.
                                </p>

                                <h4>Data Collection</h4>
                                <p>
                                    To provide you with a seamless gaming and educational experience, we collect:
                                </p>
                                <ul>
                                    <li><strong>Account Credentials:</strong> Your Full Name, Email, and Password.</li>
                                    <li><strong>Institutional Data:</strong> Your Student ID, Instructor ID, and Course information.</li>
                                    <li><strong>Game Progression:</strong> Your code submissions, battle histories, and rankings.</li>
                                </ul>

                                <h4>Your responsibilities</h4>
                                <ul>
                                    <li>Read this Privacy Policy and our Terms of Service.</li>
                                    <li>Ensure the institutional ID and email you provide belong to you.</li>
                                    <li>Keep your account credentials secure and do not share them with others.</li>
                                    <li>By submitting your information during registration, you authorize us to process it to manage your account and track your academic progress within the game.</li>
                                </ul>

                                <h4>Data Security & Usage</h4>
                                <p>
                                    We do not sell your personal data. Your information is strictly used to authenticate your identity, save your game progress, and generate analytics for your instructors regarding your performance in the towers.
                                </p>
                            </div>
                        </div>

                        <div className="landing-modal__policy-footer">
                            <button
                                type="button"
                                className="policy-accept-btn"
                                onClick={() => {
                                    setAcceptPolicy(true);
                                    setShowPolicyModal(false);
                                }}
                            >
                                I understand and agree
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Animated About / Features Section ─────────────────────────────
const featureData = [
    {
        title: 'Immersive Campaign',
        description: 'Conquer 6 unique towers, from the novice fields of Eldoria to the abstract realms of Aeterd. Master algorithms to ascend.',
        iconKey: 'towerIcon',
        gradient: 'from-purple-500/20 to-indigo-500/20',
        glowColor: 'rgba(139, 92, 246, 0.4)',
    },
    {
        title: 'Diverse Heroes',
        description: 'Command a roster of warrior, mage, and rogue coders. Unlock powerful heroes like Valerius and Nyx, each with unique traits.',
        iconKey: 'heroesIcon',
        gradient: 'from-cyan-500/20 to-blue-500/20',
        glowColor: 'rgba(6, 182, 212, 0.4)',
    },
    {
        title: 'Global Warfare',
        description: 'Test your code in real-time. Dominate high-stakes 1v1 Duels or compete in massive Multiplayer battles for glory.',
        iconKey: 'rankingIcon',
        gradient: 'from-orange-500/20 to-rose-500/20',
        glowColor: 'rgba(249, 115, 22, 0.4)',
    },
    {
        title: 'Rank Hierarchy',
        description: 'Climb the ladder from a humble Siege Novice to the godlike status of Siege Deity. Your code determines your rank.',
        iconKey: 'leaderboardIcon',
        gradient: 'from-amber-500/20 to-yellow-500/20',
        glowColor: 'rgba(245, 158, 11, 0.4)',
    },
];

const cardVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: (i) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    })
};

const AboutSection = ({ towerIcon, heroesIcon, battleIcon, rankingIcon, leaderboardIcon }) => {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
    const iconMap = { towerIcon, heroesIcon, battleIcon, rankingIcon, leaderboardIcon };

    return (
        <section id="about" className="landing-features" ref={sectionRef}>
            <div className="features-content">
                {/* Header */}
                <motion.div
                    className="features-header"
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                    <motion.span
                        className="hero-eyebrow"
                        initial={{ opacity: 0, letterSpacing: '0.5em' }}
                        animate={isInView ? { opacity: 1, letterSpacing: '0.2em' } : {}}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        GAME FEATURES
                    </motion.span>
                    <h2 className="features-title">
                        UNLEASH YOUR <span className="accent">POTENTIAL</span>
                    </h2>
                    <motion.p
                        className="features-subtitle"
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Master the art of coding through immersive gameplay, strategic battles, and a global ranking system.
                    </motion.p>
                </motion.div>

                {/* Feature Cards Grid */}
                <div className="features-grid">
                    {featureData.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            className="feature-card"
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            whileHover={{
                                y: -8,
                                scale: 1.03,
                                boxShadow: `0 20px 60px ${feature.glowColor}, 0 0 0 1px rgba(138, 95, 240, 0.3)`,
                                transition: { duration: 0.3, ease: 'easeOut' }
                            }}
                            style={{ cursor: 'default' }}
                        >
                            {/* Animated gradient shine on hover */}
                            <motion.div
                                style={{
                                    position: 'absolute', inset: 0, borderRadius: 'inherit',
                                    background: `linear-gradient(135deg, transparent 30%, ${feature.glowColor} 50%, transparent 70%)`,
                                    opacity: 0, pointerEvents: 'none'
                                }}
                                whileHover={{ opacity: 0.15 }}
                                transition={{ duration: 0.4 }}
                            />

                            {/* Icon with floating animation */}
                            <motion.div
                                className="feature-icon-wrapper"
                                animate={isInView ? {
                                    y: [0, -6, 0],
                                } : {}}
                                transition={{
                                    duration: 3 + i * 0.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: i * 0.3
                                }}
                            >
                                <img
                                    src={iconMap[feature.iconKey]}
                                    alt={feature.title}
                                    className="feature-icon-img"
                                    style={{ transform: feature.title === 'Immersive Campaign' ? 'scale(2.2)' : 'none' }}
                                />
                            </motion.div>

                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>

                            {/* Bottom accent line */}
                            <motion.div
                                style={{
                                    position: 'absolute', bottom: 0, left: '50%', height: '2px',
                                    background: `linear-gradient(90deg, transparent, ${feature.glowColor}, transparent)`,
                                    borderRadius: '1px', transform: 'translateX(-50%)',
                                }}
                                initial={{ width: 0, opacity: 0 }}
                                animate={isInView ? { width: '60%', opacity: 1 } : {}}
                                transition={{ duration: 0.8, delay: 0.5 + i * 0.15 }}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default LandingPage;
