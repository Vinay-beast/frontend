import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Star, Clock, Gift, Heart, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { getToken, getLibrary, getWishlist, getReadingProgress, getMyGifts } from '../lib/api';
import { money, formatDate, addDaysISO } from '../lib/utils';
import BookCard from '../components/BookCard';

// ---------- Section wrapper ----------
function Section({ title, icon: Icon, children, empty, emptyMsg = 'Nothing here yet' }) {
    return (
        <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                {Icon && <Icon className="w-5 h-5 text-brand-gold" />}
                <h2 className="section-title">{title}</h2>
            </div>
            {!children || empty ? (
                <div className="card text-center py-10 text-muted text-sm">{emptyMsg}</div>
            ) : children}
        </section>
    );
}

// ---------- Library Book Card ----------
function LibraryCard({ item, onOpen }) {
    // Gifted books nest data under item.book; regular books have it directly
    const title = item.title || item.book?.title || '';
    const author = item.author || item.book?.author || '';
    const imageUrl = item.image_url || item.cover || item.book?.image_url || item.book?.cover || '';
    const progress = item.progress || null;
    const pct = progress ? Math.round((progress.current_page / progress.total_pages) * 100) : 0;

    return (
        <div
            onClick={() => onOpen?.(item)}
            className="card group cursor-pointer flex gap-3 p-3 hover:border-brand-gold/30 transition"
        >
            <div className="w-14 h-20 rounded bg-brand-soft flex-shrink-0 overflow-hidden">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-brand-gold/30" /></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{title}</p>
                <p className="text-muted text-xs truncate mt-0.5">{author}</p>
                {item.expires_at && (
                    <p className="text-xs text-amber-400 mt-1">Rental expires {formatDate(item.expires_at)}</p>
                )}
                {item.gifted && (
                    <p className="text-xs mt-1" style={{ color: '#a07830' }}>🎁 Gifted book</p>
                )}
                {progress && (
                    <div className="mt-2">
                        <div className="progress-track mt-1">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-muted mt-0.5">Page {progress.current_page} / {progress.total_pages} ({pct}%)</p>
                    </div>
                )}
                <button className="mt-2 text-xs text-brand-gold hover:underline">
                    {pct > 0 && pct < 100 ? 'Continue Reading' : 'Read'} →
                </button>
            </div>
        </div>
    );
}

export default function HomePage() {
    const { token, user, openReader, setActiveBook, setWishlist: setStoreWishlist, wishlistBooks } = useStore();
    const [library, setLibrary] = useState({ owned: [], rented: [] });
    const [gifts, setGifts] = useState([]);
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const loadAll = useCallback(async () => {
        const t = token || getToken();
        if (!t) { setLoading(false); return; }
        setLoading(true);
        setLoadError(false);
        try {
            const [lib, wish, prog, giftRes] = await Promise.allSettled([
                getLibrary(t),
                getWishlist(t),
                getReadingProgress(t),
                getMyGifts(t),
            ]);
            if (lib.status === 'fulfilled') {
                setLibrary(lib.value || { owned: [], rented: [] });
            } else {
                setLoadError(true);
            }
            if (giftRes.status === 'fulfilled') {
                const claimed = (Array.isArray(giftRes.value) ? giftRes.value : []).filter(g => g.recipient_user_id);
                setGifts(claimed);
            }
            if (wish.status === 'fulfilled') {
                const wishData = Array.isArray(wish.value) ? wish.value : [];
                setStoreWishlist(wishData);   // keep Zustand store in sync so BookCard/BookModal show correct heart state
            }
            if (prog.status === 'fulfilled') setProgress(Array.isArray(prog.value) ? prog.value : []);
        } catch { setLoadError(true); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { loadAll(); }, [loadAll]);

    function openLibraryBook(item) {
        const id = item.book_id || item.id;
        openReader(id);
    }

    // Merge progress into library items
    const progressMap = Object.fromEntries(progress.map(p => [p.book_id, p]));
    const giftedOwned = gifts.map(g => ({ book: { id: g.book_id, title: g.title, author: g.author, image_url: g.image_url }, book_id: g.book_id, gifted: true }));
    const ownedWithProgress = [...(library.owned || []), ...giftedOwned]
        .filter((b, i, arr) => arr.findIndex(x => (x.book?.id || x.book_id) === (b.book?.id || b.book_id)) === i)
        .map(b => ({ ...b, progress: progressMap[b.book_id || b.book?.id] || null }));
    const rentedWithProgress = (library.rented || []).map(b => ({ ...b, progress: progressMap[b.book_id || b.id] || null }));

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Greeting */}
            <div className="mb-8">
                <h1 className="font-display text-3xl font-bold text-white">
                    Welcome back, <span className="text-brand-gold">{user?.name?.split(' ')[0] || 'Reader'}</span>
                </h1>
                <p className="text-muted mt-1">Here&apos;s your reading library</p>
            </div>

            {loading ? (
                <div className="space-y-8 pt-2">
                    {/* Book grid skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: '120px' }} />
                        ))}
                    </div>
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <p style={{ color: '#2a1f14', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>Couldn&apos;t load your library</p>
                    <p style={{ color: '#7a6550', fontSize: '0.875rem', marginBottom: '1.5rem' }}>The server may be warming up (this can take ~30 s on first load). Please retry.</p>
                    <button onClick={loadAll} className="btn-primary">Retry</button>
                </div>
            ) : (
                <>
                    {/* Owned books */}
                    <Section title={`My Books (${ownedWithProgress.length})`} icon={BookOpen} empty={ownedWithProgress.length === 0} emptyMsg="No owned books yet. Visit the Catalog to buy your first book!">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {ownedWithProgress.map((b, i) => (
                                <LibraryCard key={b.book_id || b.id || i} item={b} onOpen={openLibraryBook} />
                            ))}
                        </div>
                    </Section>

                    {/* Rentals */}
                    {rentedWithProgress.length > 0 && (
                        <Section title={`Active Rentals (${rentedWithProgress.length})`} icon={Clock} empty={false}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {rentedWithProgress.map((b, i) => (
                                    <LibraryCard key={b.book_id || b.id || i} item={b} onOpen={openLibraryBook} />
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Wishlist */}
                    <Section title={`Wishlist (${wishlistBooks.length})`} icon={Heart} empty={wishlistBooks.length === 0} emptyMsg="Your wishlist is empty. Heart books from the catalog!">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {wishlistBooks.map((b, i) => (
                                <BookCard key={b.id || b.book_id || i} book={{ id: b.book_id || b.id, title: b.title, author: b.author, price: b.price, image_url: b.image_url || b.cover, stock: b.stock ?? 1 }} />
                            ))}
                        </div>
                    </Section>
                </>
            )}
        </div>
    );
}
