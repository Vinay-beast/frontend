import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, Sparkles, Users, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { register } from '../lib/api';
import { isValidEmail } from '../lib/utils';

export default function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useStore(s => s.setAuth);
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

    function validate() {
        if (!form.name.trim()) { toast.error('Name required'); return false; }
        if (!isValidEmail(form.email)) { toast.error('Valid email required'); return false; }
        if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const { token, user } = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() });
            try { localStorage.setItem('user_cache', JSON.stringify(user)); } catch { }
            setAuth(token, user);
            navigate('/home');
        } catch (err) {
            toast.error(err.message || 'Registration failed');
        } finally { setLoading(false); }
    }

    return (
        <div className="min-h-screen flex flex-row" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* ── Left hero panel ── */}
            <div
                className="hidden lg:flex flex-col justify-center px-16 flex-1 hero-animated-gradient"
            >
                {/* Logo */}
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a07830, #b85c4a)' }}>
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold" style={{ color: '#a07830' }}>BookNook</span>
                </div>

                {/* Headline */}
                <h1 className="typewriter-text text-5xl font-extrabold leading-tight mb-4" style={{
                    background: 'linear-gradient(135deg, #1a1208 0%, #7a5520 45%, #a07830 75%, #b85c4a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    Start your<br />
                    reading journey.
                </h1>
                <p className="text-lg font-light mb-12" style={{ color: '#5c4a30', maxWidth: '380px' }}>
                    Join thousands of readers discovering their next favourite book every day.
                </p>

                {/* Feature bullets */}
                <div className="space-y-5">
                    {[
                        { Icon: Sparkles, label: 'Personalised recommendations just for you' },
                        { Icon: Users, label: 'A community of passionate book lovers' },
                        { Icon: Gift, label: 'Gifts, rewards and exclusive member offers' },
                    ].map(({ Icon, label }) => (
                        <div key={label} className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(160,120,48,0.14)' }}>
                                <Icon className="w-4 h-4" style={{ color: '#a07830' }} />
                            </div>
                            <span className="text-sm font-medium" style={{ color: '#5c4a30' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="flex flex-col justify-center items-center w-full lg:w-[520px] flex-shrink-0 px-8 py-12 bg-white overflow-y-auto">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a07830, #b85c4a)' }}>
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold" style={{ color: '#a07830' }}>BookNook</span>
                </div>

                <div className="w-full max-w-sm">
                    <h2 className="text-2xl font-bold mb-1" style={{ color: '#1a1208' }}>Create account</h2>
                    <p className="text-sm mb-8" style={{ color: '#7a6248' }}>Fill in your details to get started</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#5c4a30' }} htmlFor="reg-name">Full Name</label>
                            <input
                                id="reg-name"
                                type="text" value={form.name} onChange={set('name')}
                                className="w-full rounded-lg px-4 py-2.5 text-sm transition focus:outline-none"
                                style={{ border: '1px solid rgba(160,120,48,0.25)', background: '#faf8f4', color: '#1a1208', fontFamily: 'Inter, sans-serif' }}
                                onFocus={e => e.target.style.borderColor = '#a07830'}
                                onBlur={e => e.target.style.borderColor = 'rgba(160,120,48,0.25)'}
                                placeholder="Your name" autoComplete="name" required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#5c4a30' }} htmlFor="reg-email">Email</label>
                            <input
                                id="reg-email"
                                type="email" value={form.email} onChange={set('email')}
                                className="w-full rounded-lg px-4 py-2.5 text-sm transition focus:outline-none"
                                style={{ border: '1px solid rgba(160,120,48,0.25)', background: '#faf8f4', color: '#1a1208', fontFamily: 'Inter, sans-serif' }}
                                onFocus={e => e.target.style.borderColor = '#a07830'}
                                onBlur={e => e.target.style.borderColor = 'rgba(160,120,48,0.25)'}
                                placeholder="you@example.com" autoComplete="email" required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#5c4a30' }} htmlFor="reg-pw">Password</label>
                            <div className="relative">
                                <input
                                    id="reg-pw"
                                    type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                                    className="w-full rounded-lg px-4 py-2.5 pr-10 text-sm transition focus:outline-none"
                                    style={{ border: '1px solid rgba(160,120,48,0.25)', background: '#faf8f4', color: '#1a1208', fontFamily: 'Inter, sans-serif' }}
                                    onFocus={e => e.target.style.borderColor = '#a07830'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(160,120,48,0.25)'}
                                    placeholder="At least 6 characters" autoComplete="new-password" required
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                                    style={{ color: 'rgba(92,74,48,0.5)' }}>
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#5c4a30' }} htmlFor="reg-phone">
                                Phone <span style={{ color: 'rgba(92,74,48,0.45)', fontWeight: 400 }}>(optional)</span>
                            </label>
                            <input
                                id="reg-phone"
                                type="tel" value={form.phone} onChange={set('phone')}
                                className="w-full rounded-lg px-4 py-2.5 text-sm transition focus:outline-none"
                                style={{ border: '1px solid rgba(160,120,48,0.25)', background: '#faf8f4', color: '#1a1208', fontFamily: 'Inter, sans-serif' }}
                                onFocus={e => e.target.style.borderColor = '#a07830'}
                                onBlur={e => e.target.style.borderColor = 'rgba(160,120,48,0.25)'}
                                placeholder="+91 9876543210" autoComplete="tel"
                            />
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition mt-2 disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #a07830, #8a6228)', fontFamily: 'Inter, sans-serif', color: '#ffffff' }}
                        >
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm" style={{ color: '#7a6248' }}>
                        Already have an account?{' '}
                        <Link to="/" className="font-semibold hover:underline" style={{ color: '#a07830' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
