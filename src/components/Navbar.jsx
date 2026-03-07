import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Bell, User, BookOpen, Search, ChevronDown, LogOut, Settings, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { getMyGifts, claimSpecificGift, markAllGiftsRead } from '../lib/api';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, token, cart, cartOpen, toggleCart, logout, giftCount, setGiftCount } = useStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [giftOpen, setGiftOpen] = useState(false);
    const [gifts, setGifts] = useState([]);
    const [claimingId, setClaimingId] = useState(null);
    const menuRef = useRef(null);
    const giftRef = useRef(null);

    const cartQty = cart.reduce((s, c) => s + c.qty, 0);
    const isActive = path => location.pathname === path;

    // Load gift count
    useEffect(() => {
        if (!token) return;
        getMyGifts(token)
            .then(list => {
                setGiftCount(list.filter(g => !g.read_at).length);
                setGifts(list);
            })
            .catch(() => { });
    }, [token]);

    // When dropdown opens, mark all as read → badge goes to 0
    useEffect(() => {
        if (!giftOpen || !token) return;
        markAllGiftsRead(token)
            .then(() => {
                setGiftCount(0);
                setGifts(prev => prev.map(g => ({ ...g, read_at: g.read_at || new Date().toISOString() })));
            })
            .catch(() => { });
    }, [giftOpen]);

    async function handleClaimGift(giftId) {
        setClaimingId(giftId);
        try {
            await claimSpecificGift(token, giftId);
            // Re-fetch to get accurate count from server
            const updatedList = await getMyGifts(token);
            setGifts(updatedList);
            setGiftCount(updatedList.filter(g => !g.read_at).length);
            toast.success('Book added to your library!');
        } catch (e) {
            toast.error(e.message || 'Failed to claim gift');
        } finally {
            setClaimingId(null);
        }
    }

    // Close dropdowns on outside click
    useEffect(() => {
        function handle(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
            if (giftRef.current && !giftRef.current.contains(e.target)) setGiftOpen(false);
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    function handleLogout() {
        logout();
        navigate('/');
        toast.success('Signed out');
    }

    const navLinks = [
        { path: '/home', label: 'Library' },
        { path: '/catalog', label: 'Catalog' },
        { path: '/orders', label: 'Orders' },
        { path: '/support', label: 'Support' },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/[0.07] h-16" style={{ boxShadow: '0 1px 12px rgba(120,90,50,0.08)' }}>
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">
                {/* Logo */}
                <Link to="/home" className="flex items-center gap-2 mr-4 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-display text-lg font-bold text-brand-gold hidden sm:block">BookNook</span>
                </Link>

                {/* Nav links */}
                <div className="hidden md:flex items-center gap-1 flex-1">
                    {navLinks.map(({ path, label }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive(path) ? 'bg-brand-gold/15 text-brand-gold' : 'text-[#5c4a30] hover:text-[#1a1208] hover:bg-[rgba(160,120,48,0.10)]'}`}
                        >
                            {label}
                        </Link>
                    ))}
                    {user?.is_admin && (
                        <Link to="/admin" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive('/admin') ? 'bg-brand-gold/15 text-brand-gold' : 'text-brand-crimson/80 hover:text-brand-crimson hover:bg-brand-crimson/10'}`}>
                            Admin
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Gift bell */}
                    <div className="relative" ref={giftRef}>
                        <button
                            onClick={() => setGiftOpen(v => !v)}
                            className="relative p-2 rounded-lg text-[#5c4a30] hover:text-[#1a1208] hover:bg-[rgba(160,120,48,0.10)] transition"
                        >
                            <Bell className="w-5 h-5" />
                            {giftCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-crimson text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                    {giftCount > 9 ? '9+' : giftCount}
                                </span>
                            )}
                        </button>
                        {giftOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-brand-panel border border-black/[0.08] rounded-xl shadow-xl overflow-hidden z-50" style={{ boxShadow: '0 8px 32px rgba(100,80,50,0.15)' }}>
                                <div className="px-4 py-3 border-b border-black/[0.08]">
                                    <p className="text-sm font-semibold">Gifts</p>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {gifts.length === 0 ? (
                                        <p className="text-center text-muted text-sm py-6">No gifts yet</p>
                                    ) : gifts.map(g => (
                                        <div key={g.id} className={`px-3 py-3 transition border-b border-black/[0.05] last:border-0 ${!g.read_at ? 'bg-brand-gold/5' : 'hover:bg-black/[0.04]'}`}>
                                            <div className="flex gap-3">
                                                {/* Book cover */}
                                                {g.image_url ? (
                                                    <img src={g.image_url} alt={g.title} className="w-10 h-14 object-cover rounded shrink-0 ring-1 ring-white/10" />
                                                ) : (
                                                    <div className="w-10 h-14 bg-black/[0.06] rounded shrink-0 flex items-center justify-center"><BookOpen className="w-4 h-4 text-brand-gold/50" /></div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">{g.title || g.book_title || 'Gift Book'}</p>
                                                    {g.author && <p className="text-xs text-muted truncate">{g.author}</p>}
                                                    <p className="text-xs text-brand-gold/70 mt-0.5">From {g.sender_name || 'Someone'}</p>
                                                    {!g.recipient_user_id && (
                                                        <button
                                                            onClick={() => handleClaimGift(g.id)}
                                                            disabled={claimingId === g.id}
                                                            className="mt-1.5 text-xs px-2.5 py-1 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg transition disabled:opacity-50"
                                                        >
                                                            {claimingId === g.id ? 'Adding…' : '+ Add to Library'}
                                                        </button>
                                                    )}
                                                    {g.recipient_user_id && <p className="mt-1 text-xs text-green-400">In your library ✓</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cart */}
                    <button
                        onClick={toggleCart}
                        className="relative p-2 rounded-lg text-[#5c4a30] hover:text-[#1a1208] hover:bg-[rgba(160,120,48,0.10)] transition"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        {cartQty > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-gold text-brand-dark text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                {cartQty}
                            </span>
                        )}
                    </button>

                    {/* User menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen(v => !v)}
                            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-[rgba(160,120,48,0.08)] transition"
                        >
                            {user?.profile_pic ? (
                                <img src={user.profile_pic} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-brand-gold/30" />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-brand-gold/20 flex items-center justify-center">
                                    <User className="w-4 h-4 text-brand-gold" />
                                </div>
                            )}
                            <span className="hidden sm:block text-sm text-[#5c4a30] max-w-[100px] truncate">{user?.name || 'Account'}</span>
                            <ChevronDown className="w-3.5 h-3.5 text-[#8a7560]" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-brand-panel border border-black/[0.08] rounded-xl shadow-xl overflow-hidden z-50" style={{ boxShadow: '0 8px 32px rgba(100,80,50,0.15)' }}>
                                <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-black/[0.04] transition" style={{ color: 'rgba(42,31,20,0.80)' }}>
                                    <Settings className="w-4 h-4" /> Profile
                                </Link>
                                <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-black/[0.04] transition" style={{ color: 'rgba(42,31,20,0.80)' }}>
                                    <Package className="w-4 h-4" /> Orders
                                </Link>
                                <div className="h-px bg-black/[0.08] mx-3" />
                                <button onClick={handleLogout} className="w-full text-left flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition">
                                    <LogOut className="w-4 h-4" /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
