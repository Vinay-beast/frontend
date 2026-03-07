import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, Users, BookOpen, BarChart2,
    Search, Plus, Edit2, Trash2, Upload, RefreshCw, X, Check, Globe, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import {
    getAdminOrders, getAdminUsers, getBooks, createBookAdmin,
    updateBookAdmin, deleteBookAdmin, searchGoogleBooks, importGoogleBook, bulkImportGoogleBooks,
    uploadBookCover, uploadBookContent, uploadBookSample
} from '../lib/api';
import { money, formatDate, debounce } from '../lib/utils';

const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'books', label: 'Books', icon: BookOpen },
    { id: 'google', label: 'Import Books', icon: Globe },
];

// ---------- Mini stats card ----------
function StatCard({ label, value, sub }) {
    return (
        <div className="card p-5">
            <p className="text-muted text-sm">{label}</p>
            <p className="text-white text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-brand-gold mt-1">{sub}</p>}
        </div>
    );
}

// ---------- Book form modal ----------
function BookFormModal({ book, onClose, onSave }) {
    const { token } = useStore();
    const [form, setForm] = useState({
        title: book?.title || '', author: book?.author || '', price: book?.price || '',
        stock: book?.stock || '', description: book?.description || '', image_url: book?.image_url || ''
    });
    const [coverFile, setCoverFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title || !form.author || !form.price) { toast.error('Title, author, price required'); return; }
        setLoading(true);
        try {
            const payload = { ...form, price: Number(form.price), stock: Number(form.stock) || 0 };
            const saved = book?.id ? await updateBookAdmin(token, book.id, payload) : await createBookAdmin(token, payload);
            const bookId = saved?.id || saved?.book_id || book?.id;
            if (coverFile && bookId) {
                await uploadBookCover(token, bookId, coverFile).catch(() => { });
            }
            toast.success(book?.id ? 'Book updated' : 'Book created');
            onSave?.();
            onClose();
        } catch (e) { toast.error(e.message || 'Failed'); }
        finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-brand-panel rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition"><X className="w-5 h-5" /></button>
                <h2 className="text-lg font-bold text-white mb-5">{book?.id ? 'Edit Book' : 'Add Book'}</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {[
                        { k: 'title', label: 'Title', required: true },
                        { k: 'author', label: 'Author', required: true },
                        { k: 'price', label: 'Price (₹)', type: 'number', required: true },
                        { k: 'stock', label: 'Stock', type: 'number' },
                        { k: 'image_url', label: 'Cover Image URL' },
                    ].map(({ k, label, type = 'text', required }) => (
                        <div key={k}>
                            <label className="block text-xs text-muted mb-1">{label}</label>
                            <input type={type} value={form[k]} onChange={set(k)} required={required}
                                className="w-full bg-brand-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-gold/60"
                            />
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs text-muted mb-1">Description</label>
                        <textarea value={form.description} onChange={set('description')} rows={3}
                            className="w-full bg-brand-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-gold/60 resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">Upload Cover Image</label>
                        <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0])}
                            className="text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-brand-gold/20 file:text-brand-gold cursor-pointer"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                        {loading ? 'Saving…' : book?.id ? 'Update Book' : 'Create Book'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const navigate = useNavigate();
    const { token, user, logout } = useStore();
    const [tab, setTab] = useState('dashboard');
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bookModal, setBookModal] = useState(null); // null | 'new' | book object
    const [googleQuery, setGoogleQuery] = useState('');
    const [googleResults, setGoogleResults] = useState([]);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [selectedGoogleBooks, setSelectedGoogleBooks] = useState(new Set());
    const [bulkImporting, setBulkImporting] = useState(false);

    const loadData = useCallback(async (t = tab) => {
        setLoading(true);
        try {
            if (t === 'dashboard' || t === 'orders') { const o = await getAdminOrders(token); setOrders(Array.isArray(o) ? o : (o?.orders || [])); }
            if (t === 'dashboard' || t === 'users') { const u = await getAdminUsers(token); setUsers(Array.isArray(u) ? u : (u?.users || [])); }
            if (t === 'books' || t === 'dashboard') { const b = await getBooks(1, 200); setBooks(b?.books || []); }
        } catch (e) { toast.error(e.message || 'Load failed'); }
        finally { setLoading(false); }
    }, [token, tab]);

    useEffect(() => { loadData(tab); }, [tab]);

    async function handleDeleteBook(id) {
        if (!confirm('Delete this book?')) return;
        try { await deleteBookAdmin(token, id); setBooks(b => b.filter(x => x.id !== id)); toast.success('Deleted'); }
        catch (e) { toast.error(e.message || 'Failed'); }
    }

    const debouncedGoogleSearch = useCallback(debounce(async (q) => {
        if (!q.trim()) { setGoogleResults([]); return; }
        setGoogleLoading(true);
        try {
            const res = await searchGoogleBooks(token, q.trim(), 20);
            setGoogleResults(res?.books || res?.items || []);
        } catch (e) { toast.error(e.message || 'Failed to search Google Books'); setGoogleResults([]); }
        finally { setGoogleLoading(false); }
    }, 500), [token]);

    useEffect(() => { debouncedGoogleSearch(googleQuery); }, [googleQuery]);

    async function handleImportBook(b) {
        const payload = {
            ...b,
            price: b.price || b.suggested_price,
            category: Array.isArray(b.categories) ? b.categories[0] : (b.category || b.categories),
        };
        try { await importGoogleBook(token, payload); toast.success(`"${b.title}" imported!`); loadData('books'); }
        catch (e) { toast.error(e.message || 'Import failed'); }
    }

    async function handleBulkImport() {
        if (selectedGoogleBooks.size === 0) { toast.error('Select books to import'); return; }
        setBulkImporting(true);
        try {
            const toImport = googleResults.filter((_, i) => selectedGoogleBooks.has(i));
            await bulkImportGoogleBooks(token, toImport);
            toast.success(`${toImport.length} books imported!`);
            setSelectedGoogleBooks(new Set());
            loadData('books');
        } catch (e) { toast.error(e.message || 'Bulk import failed'); }
        finally { setBulkImporting(false); }
    }

    // Dashboard stats
    const revenue = orders.reduce((s, o) => s + Number(o.total_amount || o.total || 0), 0);

    return (
        <div className="min-h-screen bg-brand-dark flex">
            {/* Sidebar */}
            <aside className="w-60 flex-shrink-0 bg-brand-panel border-r border-white/[0.07] flex flex-col h-screen sticky top-0">
                <div className="p-5 border-b border-white/10">
                    <h1 className="font-display text-xl font-bold text-brand-gold">BookNook</h1>
                    <p className="text-xs text-muted mt-0.5">Admin Panel</p>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${tab === id ? 'bg-brand-gold/15 text-brand-gold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    ))}
                </nav>
                <div className="p-3 border-t border-white/10">
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-white/5 transition">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white capitalize">{tab === 'google' ? 'Import from Google Books' : tab}</h2>
                        <button onClick={() => loadData(tab)} disabled={loading} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Dashboard */}
                    {tab === 'dashboard' && (
                        <div className="space-y-6">
                            {/* Stat cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard label="Total Orders" value={orders.length} />
                                <StatCard label="Total Books" value={books.length} />
                                <StatCard label="Total Users" value={users.length || '–'} />
                                <StatCard label="Revenue" value={money(revenue)} sub="All orders" />
                            </div>

                            {/* Quick actions */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'All Orders', Icon: Package, id: 'orders' },
                                    { label: 'Manage Users', Icon: Users, id: 'users' },
                                    { label: 'Manage Books', Icon: BookOpen, id: 'books' },
                                ].map(({ label, Icon, id }) => (
                                    <button key={id} onClick={() => setTab(id)}
                                        className="card p-4 flex flex-col items-center gap-2 text-sm font-medium text-brand-gold hover:bg-brand-gold/10 hover:border-brand-gold/30 transition">
                                        <Icon className="w-5 h-5" />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Recent orders */}
                            <div>
                                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Recent Orders</h3>
                                <div className="space-y-2">
                                    {orders.slice(0, 5).map(o => (
                                        <div key={o.id || o.order_id} className="card p-3 flex items-center gap-4 text-sm">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-white font-medium">#{o.id || o.order_id}</span>
                                                <span className="text-muted ml-3 text-xs">{o.user_name || o.email || 'Customer'}</span>
                                            </div>
                                            <span className="tag text-xs">{o.status || 'pending'}</span>
                                            <span className="text-muted text-xs hidden sm:block">{formatDate(o.created_at)}</span>
                                            <span className="price-text font-semibold">{money(o.total_amount || o.total || 0)}</span>
                                        </div>
                                    ))}
                                    {orders.length === 0 && !loading && <p className="text-muted text-sm py-3 text-center">No orders yet</p>}
                                </div>
                            </div>

                            {/* Recent users */}
                            <div>
                                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Recent Users</h3>
                                <div className="space-y-2">
                                    {users.slice(0, 5).map(u => (
                                        <div key={u.id} className="card p-3 flex items-center gap-4 text-sm">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium">{u.name}</p>
                                                <p className="text-muted text-xs">{u.email}</p>
                                            </div>
                                            {u.is_admin && <span className="tag tag-gold text-xs">Admin</span>}
                                            <span className="text-muted text-xs hidden sm:block">{formatDate(u.created_at)}</span>
                                        </div>
                                    ))}
                                    {users.length === 0 && !loading && <p className="text-muted text-sm py-3 text-center">No users yet</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orders */}
                    {tab === 'orders' && (
                        <div className="space-y-2">
                            {orders.map(o => (
                                <div key={o.id || o.order_id} className="card p-4 flex items-center gap-4 text-sm">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white font-medium">#{o.id || o.order_id}</span>
                                        <span className="text-muted ml-3">{o.user_name || o.email || 'Customer'}</span>
                                    </div>
                                    <span className="tag text-xs">{o.status || 'pending'}</span>
                                    <span className="text-muted text-xs hidden sm:block">{formatDate(o.created_at)}</span>
                                    <span className="price-text font-semibold">{money(o.total_amount || o.total || 0)}</span>
                                </div>
                            ))}
                            {orders.length === 0 && !loading && <p className="text-center text-muted py-12">No orders found</p>}
                        </div>
                    )}

                    {/* Users */}
                    {tab === 'users' && (
                        <div className="space-y-2">
                            {users.map(u => (
                                <div key={u.id} className="card p-4 flex items-center gap-4 text-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium">{u.name}</p>
                                        <p className="text-muted text-xs">{u.email}</p>
                                    </div>
                                    {u.is_admin && <span className="tag tag-gold text-xs">Admin</span>}
                                    <span className="text-muted text-xs hidden sm:block">{formatDate(u.created_at)}</span>
                                </div>
                            ))}
                            {users.length === 0 && !loading && <p className="text-center text-muted py-12">No users found</p>}
                        </div>
                    )}

                    {/* Books */}
                    {tab === 'books' && (
                        <div>
                            <div className="flex justify-between mb-4">
                                <p className="text-muted text-sm">{books.length} books</p>
                                <button onClick={() => setBookModal('new')} className="btn-primary text-sm py-2 px-4">
                                    <Plus className="w-4 h-4 mr-1.5 inline" /> Add Book
                                </button>
                            </div>
                            <div className="space-y-2">
                                {books.map(b => (
                                    <div key={b.id} className="card p-3 flex items-center gap-3">
                                        <div className="w-10 h-14 rounded overflow-hidden bg-brand-soft flex-shrink-0">
                                            {b.image_url ? <img src={b.image_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-brand-gold/30 m-auto mt-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{b.title}</p>
                                            <p className="text-muted text-xs">{b.author} · {money(b.price)} · Stock: {b.stock}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => setBookModal(b)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDeleteBook(b.id)} className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-900/20 transition">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Google import */}
                    {tab === 'google' && (
                        <div>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="text" value={googleQuery} onChange={e => setGoogleQuery(e.target.value)}
                                    className="w-full bg-brand-panel border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/40"
                                    placeholder="Search Google Books..."
                                />
                            </div>

                            {selectedGoogleBooks.size > 0 && (
                                <div className="flex items-center justify-between bg-brand-gold/10 border border-brand-gold/20 rounded-xl px-4 py-3 mb-4">
                                    <span className="text-brand-gold text-sm">{selectedGoogleBooks.size} books selected</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSelectedGoogleBooks(new Set())} className="btn-ghost text-xs py-1.5 px-3">Clear</button>
                                        <button onClick={handleBulkImport} disabled={bulkImporting} className="btn-primary text-xs py-1.5 px-3">
                                            {bulkImporting ? 'Importing…' : 'Import Selected'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {googleLoading && <div className="text-center py-10"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto" /></div>}

                            <div className="space-y-2">
                                {googleResults.map((b, i) => {
                                    const info = b.volumeInfo || b;
                                    const thumb = info?.imageLinks?.thumbnail || b.image_url || '';
                                    const title = info?.title || b.title;
                                    const authors = info?.authors?.join(', ') || b.author || '–';
                                    const isSelected = selectedGoogleBooks.has(i);
                                    const alreadyInCatalog = b.googleBooksId
                                        ? books.some(x => x.google_books_id === b.googleBooksId)
                                        : false;

                                    return (
                                        <div key={i} className={`card p-3 flex items-center gap-3 transition ${alreadyInCatalog ? 'opacity-60' : 'cursor-pointer hover:border-white/20'} ${isSelected ? 'border-brand-gold/40 bg-brand-gold/5' : ''}`}
                                            onClick={() => !alreadyInCatalog && setSelectedGoogleBooks(s => { const n = new Set(s); isSelected ? n.delete(i) : n.add(i); return n; })}
                                        >
                                            {thumb && <img src={thumb} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{title}</p>
                                                <p className="text-muted text-xs">{authors}</p>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0 items-center">
                                                {isSelected && <Check className="w-4 h-4 text-brand-gold" />}
                                                {alreadyInCatalog ? (
                                                    <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded-lg border border-green-500/30">In catalog</span>
                                                ) : (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleImportBook(b); }}
                                                        className="btn-secondary text-xs py-1 px-2.5"
                                                    >
                                                        Import
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {!googleLoading && googleResults.length === 0 && googleQuery && (
                                    <p className="text-center text-muted py-10">No results found</p>
                                )}
                                {!googleQuery && <p className="text-center text-muted py-10">Search Google Books to import titles</p>}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Book form modal */}
            {bookModal && (
                <BookFormModal book={bookModal === 'new' ? null : bookModal} onClose={() => setBookModal(null)} onSave={() => loadData('books')} />
            )}
        </div>
    );
}
