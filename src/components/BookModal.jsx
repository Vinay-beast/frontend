import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, ShoppingCart, Heart, BookOpen, Send, Trash2, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import {
    getBookById, getBookReviews, getMyReview, canReviewBook,
    submitReview, deleteReview, addToWishlist, removeFromWishlist,
    getBookReadingAccess
} from '../lib/api';
import { money, formatDate, truncate } from '../lib/utils';

function StarInput({ value, onChange }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(n)}
                    className="text-xl transition"
                >
                    <Star className={`w-5 h-5 transition ${(hover || value) >= n ? 'fill-brand-gold text-brand-gold' : 'text-white/20'}`} />
                </button>
            ))}
        </div>
    );
}

export default function BookModal() {
    const { activeBookId, closeActiveBook, token, user, wishlistIds, addWishlistId, removeWishlistId, addToCart, openReader } = useStore();
    const [book, setBook] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [myReview, setMyReview] = useState(null);
    const [canReview, setCanReview] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(false);
    const [giftEmail, setGiftEmail] = useState('');
    const [showGift, setShowGift] = useState(false);
    const [rentDays, setRentDays] = useState(30);

    const isWishlisted = wishlistIds.has(activeBookId);

    const load = useCallback(async () => {
        if (!activeBookId) return;
        setLoading(true);
        try {
            const [b, revs] = await Promise.all([
                getBookById(activeBookId),
                getBookReviews(activeBookId).catch(() => []),
            ]);
            setBook(b);
            setReviews(revs || []);
            if (token) {
                const [mr, cr] = await Promise.all([
                    getMyReview(token, activeBookId).catch(() => null),
                    canReviewBook(token, activeBookId).catch(() => false),
                ]);
                setMyReview(mr?.review || mr || null);
                setCanReview(cr?.canReview ?? cr?.can_review ?? false);
            }
        } catch (e) { toast.error('Failed to load book'); }
        finally { setLoading(false); }
    }, [activeBookId, token]);

    useEffect(() => { if (activeBookId) { load(); setActiveTab('details'); setShowGift(false); } }, [activeBookId]);

    // Close on escape
    useEffect(() => {
        const h = e => { if (e.key === 'Escape') closeActiveBook(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, []);

    async function toggleWishlist() {
        if (!token) { toast.error('Sign in first'); return; }
        try {
            if (isWishlisted) { await removeFromWishlist(token, activeBookId); removeWishlistId(activeBookId); toast('Removed from wishlist'); }
            else { await addToWishlist(token, activeBookId); addWishlistId(activeBookId); toast.success('Added to wishlist ❤️'); }
        } catch { toast.error('Failed'); }
    }

    function handleBuy(mode = 'buy') {
        if (!book) return;
        addToCart(book, mode, mode === 'rent' ? { rentDays } : mode === 'gift' ? { giftEmail } : {});
        toast.success(`Added to cart`);
        closeActiveBook();
    }

    async function handleRead() {
        if (!token) { toast.error('Sign in first'); return; }
        try {
            const data = await getBookReadingAccess(token, activeBookId);
            if (data?.readingUrl) { openReader(activeBookId); closeActiveBook(); }
            else toast.error(data?.message || 'No reading access');
        } catch (e) { toast.error(e.message || 'Cannot open reader'); }
    }

    async function submitReviewHandler() {
        if (!token) { toast.error('Sign in first'); return; }
        if (!reviewText.trim()) { toast.error('Write a review'); return; }
        try {
            await submitReview(token, activeBookId, reviewRating, reviewText.trim());
            toast.success('Review submitted!');
            load();
        } catch (e) { toast.error(e.message || 'Failed'); }
    }

    async function deleteReviewHandler() {
        try {
            await deleteReview(token, activeBookId);
            toast.success('Review deleted');
            load();
        } catch (e) { toast.error(e.message || 'Failed'); }
    }

    if (!activeBookId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeActiveBook} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-brand-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
                {/* Close */}
                <button onClick={closeActiveBook} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/30 hover:bg-black/60 text-white/60 hover:text-white transition">
                    <X className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : book ? (
                    <div className="overflow-y-auto flex-1">
                        {/* Header */}
                        <div className="flex gap-5 p-6 pb-0">
                            <div className="w-28 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-brand-soft shadow-lg">
                                {book.image_url ? (
                                    <img src={book.image_url} alt={book.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <BookOpen className="w-8 h-8 text-brand-gold/40" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 pt-1 pr-6">
                                <h2 className="text-white font-display text-xl font-bold leading-snug">{book.title}</h2>
                                <p className="text-muted mt-1">{book.author}</p>
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                    <span className="price-text text-2xl font-bold">{money(book.price)}</span>
                                    {book.stock > 0 && <span className="tag tag-gold text-xs">In Stock ({book.stock})</span>}
                                    {book.stock === 0 && <span className="tag text-xs bg-red-900/30 border-red-500/30 text-red-400">Out of Stock</span>}
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <button onClick={() => handleBuy('buy')} disabled={book.stock === 0} className="btn-primary text-sm py-2 px-4">
                                        <ShoppingCart className="w-3.5 h-3.5 mr-1 inline" /> Buy
                                    </button>
                                    <button onClick={() => handleBuy('rent')} className="btn-secondary text-sm py-2 px-4">
                                        <BookOpen className="w-3.5 h-3.5 mr-1 inline" /> Rent {money(book.price * (rentDays === 60 ? 0.50 : 0.35))} · {rentDays === 60 ? '50' : '35'}%
                                    </button>
                                    <button onClick={handleRead} className="btn-ghost text-sm py-2 px-4">
                                        Read
                                    </button>
                                    <button
                                        onClick={toggleWishlist}
                                        className={`p-2 rounded-lg border transition ${isWishlisted ? 'bg-brand-crimson/20 border-brand-crimson/40 text-brand-crimson' : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-brand-crimson' : ''}`} />
                                    </button>
                                    <button onClick={() => setShowGift(v => !v)} className="p-2 rounded-lg border border-white/10 text-white/50 hover:text-brand-gold hover:border-brand-gold/30 transition">
                                        <Gift className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Rent days picker */}
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-xs text-muted">Rent duration:</span>
                                    {[30, 60].map(d => (
                                        <button key={d} onClick={() => setRentDays(d)} className={`text-xs px-2.5 py-1 rounded-full border transition ${rentDays === d ? 'border-brand-gold text-brand-gold bg-brand-gold/10' : 'border-white/10 text-muted hover:border-white/20'}`}>{d}d</button>
                                    ))}
                                </div>

                                {/* Gift email */}
                                {showGift && (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="email" value={giftEmail} onChange={e => setGiftEmail(e.target.value)}
                                            className="flex-1 bg-brand-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/60"
                                            placeholder="Gift to email..."
                                        />
                                        <button onClick={() => handleBuy('gift')} className="btn-primary text-sm py-1.5 px-3"><Gift className="w-3.5 h-3.5" /></button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-6 mt-5 border-b border-white/10">
                            {['details', 'reviews'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab ? 'border-brand-gold text-brand-gold' : 'border-transparent text-muted hover:text-white'}`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    {tab === 'reviews' && reviews.length > 0 && <span className="ml-1.5 text-xs text-muted">({reviews.length})</span>}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 pt-4">
                            {activeTab === 'details' && (
                                <div>
                                    <p className="text-white/80 text-sm leading-relaxed">{book.description || 'No description available.'}</p>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="space-y-4">
                                    {/* Submit review */}
                                    {canReview && !myReview && (
                                        <div className="card p-4 space-y-3">
                                            <p className="text-sm font-medium text-white">Write a Review</p>
                                            <StarInput value={reviewRating} onChange={setReviewRating} />
                                            <textarea
                                                value={reviewText} onChange={e => setReviewText(e.target.value)}
                                                rows={3}
                                                className="w-full bg-brand-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/60 resize-none"
                                                placeholder="Share your thoughts..."
                                            />
                                            <button onClick={submitReviewHandler} className="btn-primary text-sm py-2 px-4">
                                                <Send className="w-3.5 h-3.5 mr-1.5 inline" /> Submit
                                            </button>
                                        </div>
                                    )}

                                    {/* Reviews list */}
                                    {reviews.length === 0 ? (
                                        <p className="text-center text-muted py-8">No reviews yet. Be the first!</p>
                                    ) : reviews.map((r, i) => (
                                        <div key={i} className="card p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-medium text-white">{r.user_name || r.name || 'User'}</p>
                                                    <div className="flex gap-0.5 mt-1">
                                                        {[1, 2, 3, 4, 5].map(n => (
                                                            <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-brand-gold text-brand-gold' : 'text-white/15'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
                                                    {(r.user_id === user?.id || myReview) && (
                                                        <button onClick={deleteReviewHandler} className="p-1 text-red-400/50 hover:text-red-400 transition">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {r.review_text && <p className="text-sm text-white/70 mt-2 leading-relaxed">{r.review_text}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : !loading && <p className="text-center text-muted py-16">Book not found</p>}
            </div>
        </div>
    );
}
