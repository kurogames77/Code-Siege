import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, GraduationCap, User, Mail, Lock, BookOpen, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import '../styles/landing-page.css';
import nameImage from '../assets/name.png';
import gameIcon from '../assets/icongame.png';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, isAuthenticated, user } = useUser();
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

                const response = await register(email, password, fullName, {
                    student_id: modal?.role === 'student' ? studentId : instructorId,
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

                    await login(studentId, password, true); // true = use student_id
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

                    await login(instructorId, password, true); // true = use id lookup
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

            {modal?.type === 'login' && (
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
                        </form>

                        <div className="landing-modal__footnote">
                            <span>Need a new account?</span>
                            <button type="button" onClick={() => openSignup(modal.role)}>
                                Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
