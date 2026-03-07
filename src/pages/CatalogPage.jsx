import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, ChevronDown, SlidersHorizontal, Bot, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';
import { getBooks, searchBooks } from '../lib/api';
import { debounce } from '../lib/utils';
import BookCard from '../components/BookCard';

const PAGE_SIZE = 24;

export default function CatalogPage() {
    const { setActiveBook, toggleShoppingAgent, toggleAiChat } = useStore();
    const [books, setBooks] = useState([]);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('default');
    const searchInputRef = useRef(null);
    const abortRef = useRef(null);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    async function loadBooks(q, pg) {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        try {
            const res = q.trim() ? await searchBooks(q.trim(), pg, PAGE_SIZE) : await getBooks(pg, PAGE_SIZE);
            setBooks(res.books || []);
            setTotal(res.total ?? (res.books?.length || 0));
        } catch (e) {
            if (e?.name !== 'AbortError') setBooks([]);
        } finally { setLoading(false); }
    }

    // Debounced search
    const debouncedSearch = useCallback(debounce((q) => { setPage(1); loadBooks(q, 1); }, 400), []);

    useEffect(() => { loadBooks(query, page); }, [page]);
    useEffect(() => { setPage(1); debouncedSearch(query); }, [query]);

    // Sort books client-side
    const sorted = [...books].sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#1a1208' }}>Book Catalog</h1>
                    {total > 0 && <p className="text-muted mt-1 text-sm">{total} books available</p>}
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Agent buttons */}
                    <button
                        onClick={toggleShoppingAgent}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition"
                        style={{ background: 'rgba(160,120,48,0.12)', color: '#a07830', border: '1px solid rgba(160,120,48,0.22)' }}
                    >
                        <Bot className="w-4 h-4" /> Shopping Agent
                    </button>
                    <button
                        onClick={toggleAiChat}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition"
                        style={{ background: 'rgba(184,92,74,0.10)', color: '#b85c4a', border: '1px solid rgba(184,92,74,0.22)' }}
                    >
                        <Sparkles className="w-4 h-4" /> Recommendations
                    </button>

                    {/* Sort */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="appearance-none rounded-lg pl-3 pr-8 py-2 text-sm cursor-pointer focus:outline-none transition"
                            style={{ fontFamily: 'Inter, sans-serif', background: '#faf8f4', border: '1px solid rgba(160,120,48,0.28)', color: '#2a1f14' }}
                            onFocus={e => e.target.style.borderColor = '#a07830'}
                            onBlur={e => e.target.style.borderColor = 'rgba(160,120,48,0.28)'}
                        >
                            <option value="default">Default</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="title">Title A–Z</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7560] pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full bg-brand-panel border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/40 transition"
                    placeholder="Search books by title or author..."
                />
                {query && (
                    <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition" style={{ color: '#8a7560' }} onMouseEnter={e => e.currentTarget.style.color = '#1a1208'} onMouseLeave={e => e.currentTarget.style.color = '#8a7560'}>
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="skeleton aspect-[2/3]" />
                    ))}
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-24">
                    <Search className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-muted">No books found{query ? ` for "${query}"` : ''}</p>
                    {query && <button onClick={() => setQuery('')} className="btn-ghost mt-3 text-sm">Clear search</button>}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {sorted.map(book => (
                        <BookCard key={book.id} book={book} onOpenModal={b => setActiveBook(b.id)} catalogMode />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn-ghost text-sm py-2 px-4 disabled:opacity-40"
                    >
                        ← Prev
                    </button>
                    <div className="flex gap-1">
                        {(() => {
                            const count = Math.min(5, totalPages);
                            const start = Math.max(1, Math.min(page - 2, totalPages - count + 1));
                            return Array.from({ length: count }, (_, i) => start + i).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-lg text-sm transition ${p === page ? 'bg-brand-gold text-white font-bold' : 'hover:bg-[rgba(160,120,48,0.10)]'}`}
                                    style={p !== page ? { color: '#5c4a30' } : {}}
                                >
                                    {p}
                                </button>
                            ));
                        })()}
                    </div>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="btn-ghost text-sm py-2 px-4 disabled:opacity-40"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
