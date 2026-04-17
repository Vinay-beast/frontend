import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, BookOpen, Star, Zap, Clock, Gift } from 'lucide-react';
import useStore from '../store/useStore';
import { addToWishlist, removeFromWishlist, getBulkRatings } from '../lib/api';
import { money, truncate } from '../lib/utils';
import toast from 'react-hot-toast';

// Shared ratings cache (module-level)
const ratingsCache = {};

export default function BookCard({ book, onOpenModal, catalogMode = false }) {
    const { token, wishlistIds, addWishlistId, removeWishlistId, addToCart, toggleCart, setActiveBook } = useStore();
    const isWishlisted = wishlistIds.has(String(book?.id));
    const [rating, setRating] = useState(ratingsCache[book?.id] ?? null);
    const [wishLoading, setWishLoading] = useState(false);

    useEffect(() => {
        if (!book?.id || ratingsCache[book.id] !== undefined) return;
        getBulkRatings([book.id])
            .then(res => {
                const val = res?.[book.id]?.avgRating ?? res?.[book.id]?.avg ?? null;
                ratingsCache[book.id] = val;
                setRating(val);
            })
            .catch(() => { ratingsCache[book.id] = null; });
    }, [book?.id]);

    async function toggleWishlist(e) {
        e.stopPropagation();
        if (!token) { toast.error('Sign in to wishlist'); return; }
        setWishLoading(true);
        try {
            if (isWishlisted) { await removeFromWishlist(token, book.id); removeWishlistId(book.id); toast('Removed from wishlist'); }
            else { await addToWishlist(token, book.id); addWishlistId(book.id); toast.success('Added to wishlist'); }
        } catch { toast.error('Failed'); }
        finally { setWishLoading(false); }
    }

    function handleBuy(e) {
        e.stopPropagation();
        addToCart(book, 'buy');
        toast.success(`${book.title} added to cart`);
    }

    function handleBuyNow(e) {
        e.stopPropagation();
        addToCart(book, 'buy');
        toggleCart();
    }

    function handleRent(e) {
        e.stopPropagation();
        addToCart(book, 'rent', { rentDays: 30 });
        toast.success(`${book.title} added for rental`);
    }

    function handleGift(e) {
        e.stopPropagation();
        addToCart(book, 'gift');
        toast.success(`${book.title} added as gift`);
    }

    function open() {
        if (onOpenModal) onOpenModal(book);
        else setActiveBook(book.id);
    }

    if (!book) return null;

    return (
        <div
            onClick={open}
            className="card group cursor-pointer flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 hover:border-brand-gold/30"
        >
            {/* Cover image */}
            <div className="relative aspect-[2/3] bg-brand-soft overflow-hidden flex-shrink-0">
                {book.image_url ? (
                    <img
                        src={book.image_url}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-soft to-brand-dark">
                        <BookOpen className="w-10 h-10 text-brand-gold/40 mb-2" />
                        <p className="text-xs text-muted text-center px-3 leading-snug">{truncate(book.title, 40)}</p>
                    </div>
                )}

                {/* Wishlist button */}
                <button
                    onClick={toggleWishlist}
                    disabled={wishLoading}
                    className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition ${isWishlisted ? 'bg-brand-crimson/80 text-white' : 'bg-black/40 text-white/60 hover:text-white hover:bg-black/60'}`}
                >
                    <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
                </button>

                {/* Stock badge */}
                {book.stock === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 text-xs text-center py-1 text-white/60">Out of stock</div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-1.5 flex-1">
                <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">{book.title}</h3>
                <p className="text-muted text-xs truncate">{book.author}</p>

                {rating !== null && (
                    <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-brand-gold text-brand-gold" />
                        <span className="text-xs text-brand-gold font-medium">{Number(rating).toFixed(1)}</span>
                    </div>
                )}

                <div className="mt-auto pt-2">
                    {catalogMode ? (
                        <>
                            <span className="price-text font-bold text-base block mb-2">{money(book.price)}</span>
                            <div className="grid grid-cols-2 gap-1">
                                <button
                                    onClick={handleBuy}
                                    disabled={book.stock === 0}
                                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ background: 'rgba(0,0,0,0.06)', color: '#5c4a30' }}
                                >
                                    <ShoppingCart className="w-3 h-3" /> Cart
                                </button>
                                <button
                                    onClick={handleBuyNow}
                                    disabled={book.stock === 0}
                                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ background: 'rgba(160,120,48,0.16)', color: '#a07830' }}
                                >
                                    <Zap className="w-3 h-3" /> Buy
                                </button>
                                <button
                                    onClick={handleRent}
                                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition"
                                    style={{ background: 'rgba(74,120,160,0.12)', color: '#3a78a0' }}
                                >
                                    <Clock className="w-3 h-3" /> Rent
                                </button>
                                <button
                                    onClick={handleGift}
                                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition"
                                    style={{ background: 'rgba(184,92,74,0.12)', color: '#b85c4a' }}
                                >
                                    <Gift className="w-3 h-3" /> Gift
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-between gap-2">
                            <span className="price-text font-bold">{money(book.price)}</span>
                            <button
                                onClick={handleBuy}
                                disabled={book.stock === 0}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ShoppingCart className="w-3 h-3" /> Buy
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
