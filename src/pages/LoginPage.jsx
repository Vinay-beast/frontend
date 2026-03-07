import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, Library, Star, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { login, loginWithGoogle } from '../lib/api';

export default function LoginPage() {
    const navigate = useNavigate();
    const setAuth = useStore(s => s.setAuth);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    function cacheUser(user) {
        try { localStorage.setItem('user_cache', JSON.stringify(user)); } catch { }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email.trim() || !password) { toast.error('Fill in all fields'); return; }
        setLoading(true);
        try {
            const { token, user } = await login({ email: email.trim(), password });
            cacheUser(user);
            setAuth(token, user);
            navigate(user?.is_admin ? '/admin' : '/home');
        } catch (err) {
            toast.error(err.message || 'Login failed');
        } finally { setLoading(false); }
    }

    async function handleGoogle() {
        if (!window.firebase) { toast.error('Firebase not loaded'); return; }
        setLoading(true);
        try {
            const provider = new window.firebase.auth.GoogleAuthProvider();
            const result = await window.firebase.auth().signInWithPopup(provider);
            const idToken = await result.user.getIdToken();
            const { token, user } = await loginWithGoogle(idToken);
            cacheUser(user);
            setAuth(token, user);
            navigate(user?.is_admin ? '/admin' : '/home');
        } catch (err) {
            toast.error(err.message || 'Google sign-in failed');
        } finally { setLoading(false); }
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">

            {/* ── LEFT: hero branding ── */}
            <div
                className="hidden lg:flex flex-col justify-center px-16 xl:px-24 flex-1 relative overflow-hidden hero-animated-gradient"
            >
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(160,120,48,0.13) 0%, transparent 70%)' }} />
                <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(184,92,74,0.10) 0%, transparent 70%)' }} />

                {/* Logo row */}
                <div className="flex items-center gap-3 mb-20">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a07830] to-[#b85c4a] flex items-center justify-center shadow-md">
                        <BookOpen className="w-5 h-5" style={{ color: '#fff' }} />
                    </div>
                    <span className="text-xl font-bold" style={{ color: '#a07830', letterSpacing: '-0.01em' }}>BookNook</span>
                </div>

                {/* Big headline */}
                <h1
                    className="typewriter-text text-5xl xl:text-6xl font-extrabold leading-[1.08] mb-5"
                    style={{
                        background: 'linear-gradient(135deg, #1a1208 0%, #7a5520 45%, #a07830 75%, #b85c4a 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.025em',
                    }}
                >
                    Read more.<br />
                    Discover more.
                </h1>
                <p className="text-base xl:text-lg leading-relaxed mb-12" style={{ color: '#5c4a30', maxWidth: '380px' }}>
                    Your personal digital library — thousands of books, AI summaries, and a reading experience you&apos;ll love.
                </p>

                {/* Feature bullets */}
                <div className="flex flex-col gap-4">
                    {[
                        { Icon: Library, text: 'Access thousands of titles instantly' },
                        { Icon: Star, text: 'AI-powered reading recommendations' },
                        { Icon: Bookmark, text: 'Track progress across all your books' },
                    ].map(({ Icon, text }) => (
                        <div key={text} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(160,120,48,0.13)' }}>
                                <Icon className="w-4 h-4" style={{ color: '#a07830' }} />
                            </div>
                            <span className="text-sm font-medium" style={{ color: '#5c4a30' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT: form panel ── */}
            <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 w-full lg:w-[480px] xl:w-[520px] shrink-0 bg-white">

                {/* Mobile logo */}
                <div className="flex flex-col items-center mb-8 lg:hidden">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a07830] to-[#b85c4a] flex items-center justify-center mb-2">
                        <BookOpen className="w-6 h-6" style={{ color: '#fff' }} />
                    </div>
                    <span className="text-xl font-bold" style={{ color: '#a07830' }}>BookNook</span>
                </div>

                <div className="w-full max-w-sm">
                    <h2 className="text-2xl font-bold mb-1" style={{ color: '#1a1208' }}>Welcome back</h2>
                    <p className="text-sm mb-7" style={{ color: '#8a7560' }}>Sign in to continue reading</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#5c4a30' }} htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#5c4a30' }} htmlFor="login-pw">Password</label>
                            <div className="relative">
                                <input
                                    id="login-pw"
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    style={{ paddingRight: '2.5rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                                    style={{ color: 'rgba(42,31,20,0.40)' }}
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.09)' }} />
                        <span className="text-xs text-muted">or</span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.09)' }} />
                    </div>

                    <button
                        onClick={handleGoogle}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 rounded-lg py-2.5 font-medium transition"
                        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.12)', color: '#2a1f14' }}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Continue with Google
                    </button>

                    <p className="mt-7 text-center text-sm text-muted">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="font-semibold hover:underline" style={{ color: '#a07830' }}>Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

