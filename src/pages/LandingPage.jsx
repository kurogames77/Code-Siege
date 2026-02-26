import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, GraduationCap, User, Mail, Lock, BookOpen, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff, Trophy, Swords, Users, Castle } from 'lucide-react';
import { useRef } from 'react';
import '../styles/landing-page.css';
import nameImage from '../assets/name.png';
import gameIcon from '../assets/icongame.png';
import towerIcon from '../assets/tower11.png';
import heroesIcon from '../assets/heroes.png';
import battleIcon from '../assets/doorbattle.png';
import rankingIcon from '../assets/ranking.png';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, loginWithGoogle, isAuthenticated, user } = useUser();
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
    const [showPassword, setShowPassword] = useState(false);

    const openSignup = (role = 'student') => {
        setModal({ type: 'signup', role });
        setSignupSuccess(false);
        resetForm();
    };

    useEffect(() => {
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
        setModal((prev) => (prev ? { ...prev, role } : prev));
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setFullName('');
        setStudentId('');
        setInstructorId('');
        setCourse('');
        setError('');
        setShowPassword(false);
    };

    useEffect(() => {
        if (location.state?.openLogin) {
            openLogin();
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Check for auth redirect (e.g. email confirmation) on Landing Page too
    useEffect(() => {
        console.log("LandingPage: Checking hash", location.hash);
        if (location.hash && (location.hash.includes('access_token') || location.hash.includes('type=initial_recovery') || location.hash.includes('type=signup'))) {
            navigate('/ConfirmationPage');
        }
    }, [location, navigate]);

    // Check for logout state
    useEffect(() => {
        if (location.state?.loggedOut) {
            toast.popup('Logged out successfully');
            // Clear state to prevent showing again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            // Check for incomplete profile (social login)
            if (!user.studentId) {
                if (modal?.type !== 'complete_profile') {
                    setModal({ type: 'complete_profile', role: (user.role === 'user' || !user.role) ? 'student' : user.role });
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

                const response = await register(email.trim(), password, fullName, {
                    student_id: (modal?.role === 'student' ? studentId : instructorId).trim(),
                    course: course,
                    role: modal?.role
                });

                // Show success message or close modal depending on role
                setError(''); // clear any errors
                setLoading(false);

                if (response?.applicationPending) {
                    toast.popup('Application submitted! Please wait for the admin to send verification through gmail.');
                    closeModal(); // Close immediately for instructors
                } else {
                    setSignupSuccess(true); // Show 'Check Your Email' only for students
                    toast.popup('Account created! Please check your email.');
                }
            } else {
                // Login
                if (modal?.role === 'student') {
                    // Students login with Student ID
                    if (!studentId.trim()) {
                        throw new Error('Please enter your Student ID');
                    }
                    if (!password.trim()) {
                        throw new Error('Please enter your password');
                    }

                    await login(studentId.trim(), password, true); // true = use student_id
                    toast.popup('Welcome back!');
                    closeModal();
                    // Navigation handled by useEffect
                } else {
                    // Instructors login with Instructor ID
                    if (!instructorId.trim()) {
                        throw new Error('Please enter your Instructor ID');
                    }
                    if (!password.trim()) {
                        throw new Error('Please enter your password');
                    }

                    await login(instructorId.trim(), password, true); // true = use id lookup
                    toast.popup('Welcome back!');
                    closeModal();
                    // Navigation handled by useEffect
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
            const id = (role === 'student' ? studentId : instructorId).trim();

            if (!id) {
                throw new Error(`Please enter your ${role === 'student' ? 'Student' : 'Instructor'} ID`);
            }

            if (role === 'student' && !course) {
                throw new Error('Please select your course');
            }

            await updateProfile({
                student_id: id,
                course: course,
                role: role,
                name: user.name // Keep existing name from Google
            });

            toast.popup('Profile completed! Welcome to Code Siege.');
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
                        <button className="hero-btn" type="button" onClick={() => openSignup('teacher')}>
                            I'm an Instructor
                        </button>
                        <button className="hero-btn" type="button" onClick={() => openSignup('student')}>
                            I'm a Student
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section (About) */}
            < section id="about" className="landing-features" >
                <div className="features-content">
                    <div className="features-header reveal">
                        <span className="hero-eyebrow">GAME FEATURES</span>
                        <h2 className="features-title">UNLEASH YOUR <span className="accent">POTENTIAL</span></h2>
                        <p className="features-subtitle">Master the art of coding through immersive gameplay, strategic battles, and a global ranking system.</p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card reveal" style={{ '--index': 1 }}>
                            <div className="feature-icon-wrapper">
                                <img src={towerIcon} alt="Campaign" className="feature-icon-img" />
                            </div>
                            <h3>Immersive Campaign</h3>
                            <p>Conquer 6 unique towers, from the novice fields of Eldoria to the abstract realms of Aeterd. Master algorithms to ascend.</p>
                        </div>

                        <div className="feature-card reveal" style={{ '--index': 2 }}>
                            <div className="feature-icon-wrapper">
                                <img src={heroesIcon} alt="Heroes" className="feature-icon-img" />
                            </div>
                            <h3>Diverse Heroes</h3>
                            <p>Command a roster of warrior, mage, and rogue coders. Unlock powerful heroes like Valerius and Nyx, each with unique traits.</p>
                        </div>

                        <div className="feature-card reveal" style={{ '--index': 3 }}>
                            <div className="feature-icon-wrapper">
                                <img src={battleIcon} alt="Warfare" className="feature-icon-img" />
                            </div>
                            <h3>Global Warfare</h3>
                            <p>Test your code in real-time. Dominate high-stakes 1v1 Duels or compete in massive Multiplayer battles for glory.</p>
                        </div>

                        <div className="feature-card reveal" style={{ '--index': 4 }}>
                            <div className="feature-icon-wrapper">
                                <img src={rankingIcon} alt="Ranking" className="feature-icon-img" />
                            </div>
                            <h3>Rank Hierarchy</h3>
                            <p>Climb the ladder from a humble Siege Novice to the godlike status of Siege Deity. Your code determines your rank.</p>
                        </div>
                    </div>
                </div>
            </section >

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
                                        className={`landing-modal__role ${modal.role === 'teacher' ? 'is-active' : ''}`}
                                        onClick={() => updateRole('teacher')}
                                    >
                                        <User />
                                        Instructor
                                    </button>
                                </div>

                                {error && (
                                    <div className="landing-modal__error">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <form className="landing-modal__form" onSubmit={handleSubmit}>
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
                                            <span className="landing-modal__label">Course</span>
                                            <div className="landing-modal__input">
                                                <BookOpen />
                                                <select
                                                    value={course}
                                                    onChange={(e) => setCourse(e.target.value)}
                                                >
                                                    <option value="" disabled>Select your course</option>
                                                    <option value="BSCS">BSCS</option>
                                                    <option value="BSIS">BSIS</option>
                                                    <option value="BSIT">BSIT</option>
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

                                    <button className="landing-modal__submit" type="submit" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                Creating Account...
                                            </>
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
                                        onClick={loginWithGoogle}
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
                                    className={`landing-modal__role ${modal.role === 'teacher' ? 'is-active' : ''}`}
                                    onClick={() => updateRole('teacher')}
                                >
                                    <User />
                                    Instructor
                                </button>
                            </div>

                            {error && (
                                <div className="landing-modal__error">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <form className="landing-modal__form" onSubmit={handleSubmit}>
                                {modal.role === 'student' ? (
                                    <label className="landing-modal__field">
                                        <span className="landing-modal__label">Student ID</span>
                                        <div className="landing-modal__input">
                                            <User />
                                            <input
                                                type="text"
                                                required
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

                                <button className="landing-modal__submit" type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Logging in...
                                        </>
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
                                    onClick={loginWithGoogle}
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
                                className={`landing-modal__role ${modal.role === 'teacher' ? 'is-active' : ''}`}
                                onClick={() => updateRole('teacher')}
                            >
                                <User />
                                Instructor
                            </button>
                        </div>

                        {error && (
                            <div className="landing-modal__error">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <form className="landing-modal__form" onSubmit={handleCompleteProfile}>
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
                                            <option value="BSCS">BSCS</option>
                                            <option value="BSIS">BSIS</option>
                                            <option value="BSIT">BSIT</option>
                                        </select>
                                    </div>
                                </label>
                            )}

                            <button className="landing-modal__submit" type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Saving Profile...
                                    </>
                                ) : (
                                    'Enter Code Siege'
                                )}
                            </button>
                        </form>

                        <div className="landing-modal__footnote mt-6">
                            <span>Logged in as </span>
                            <span className="text-white font-bold ml-1">{user.email}</span>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default LandingPage;
