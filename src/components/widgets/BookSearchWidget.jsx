import React, { useState, useRef } from 'react';
import { Camera, X, Upload, Search, BookOpen, Loader2, ShoppingCart, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { searchBookByImage } from '../../lib/api';

export default function BookSearchWidget() {
    const { token, addToCart, setActiveBook } = useStore();
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const fileRef = useRef(null);

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
        const url = URL.createObjectURL(file);
        setPreview(url);
        setResults([]);
        uploadAndSearch(file);
    }

    async function uploadAndSearch(file) {
        setLoading(true);
        try {
            const res = await searchBookByImage(token, file);
            if (res?.found && res?.result?.book) {
                // Backend found an exact match in our catalog
                const b = res.result.book;
                setResults([{ ...b, cover_image: b.cover_image || b.cover || b.image_url }]);
            } else if (res?.result?.identifiedTitle) {
                // Identified by AI but not in our catalog
                toast(`Identified as "${res.result.identifiedTitle}" but not in our catalog`, { icon: '📚' });
                setResults([]);
            } else {
                toast('No matching books found', { icon: '📚' });
                setResults([]);
            }
        } catch (e) {
            toast.error(e.message || 'Image search failed');
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setPreview(null);
        setResults([]);
        if (fileRef.current) fileRef.current.value = '';
    }

    function onDrop(e) {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }

    return (
        <div className="fixed top-20 right-6 z-40 flex flex-col items-end gap-3">
            {/* Panel */}
            {open && (
                <div className="w-72 sm:w-80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in" style={{ maxHeight: '500px', background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.07]" style={{ background: 'rgba(160,120,48,0.08)' }}>
                        <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-brand-gold" />
                            <div>
                                <p className="text-sm font-semibold text-[#1a1208]">Visual Book Search</p>
                                <p className="text-xs text-muted">Upload a book cover image</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-[#8a7560] hover:text-[#1a1208] hover:bg-black/[0.05] transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {/* Upload zone */}
                        {!preview ? (
                            <div
                                onDrop={onDrop}
                                onDragOver={e => e.preventDefault()}
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-black/[0.10] rounded-xl p-6 text-center cursor-pointer hover:border-brand-gold/40 hover:bg-brand-gold/5 transition group"
                            >
                                <Upload className="w-8 h-8 text-white/20 group-hover:text-brand-gold/50 mx-auto mb-2 transition" />
                                <p className="text-xs text-muted">Drop an image or click to browse</p>
                                <p className="text-xs text-[#8a7560]/60 mt-1">Supports JPG, PNG, WEBP · max 5MB</p>
                                <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
                            </div>
                        ) : (
                            <div className="relative">
                                <img src={preview} alt="Search preview" className="w-full h-40 object-contain rounded-xl bg-brand-soft border border-black/[0.07]" />
                                <button
                                    onClick={reset}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-black/[0.10] flex items-center justify-center text-[#8a7560] hover:text-[#1a1208] transition"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Loading state */}
                        {loading && (
                            <div className="flex items-center justify-center gap-2 py-4">
                                <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
                                <span className="text-xs text-muted">Searching catalog...</span>
                            </div>
                        )}

                        {/* Results */}
                        {results.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-brand-gold">{results.length} match{results.length !== 1 ? 'es' : ''} found</p>
                                {results.map((book, i) => (
                                    <div key={book._id || book.id || i} className="flex gap-2.5 bg-brand-soft rounded-xl p-2.5 border border-black/[0.06] hover:border-brand-gold/25 transition">
                                        {(book.cover_image || book.cover || book.image_url) ? (
                                            <img src={book.cover_image || book.cover || book.image_url} alt={book.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                                        ) : (
                                            <div className="w-10 h-14 bg-brand-soft rounded-lg flex items-center justify-center flex-shrink-0">
                                                <BookOpen className="w-4 h-4 text-white/20" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white truncate">{book.title}</p>
                                            <p className="text-xs text-muted truncate">{book.author}</p>
                                            {book.price !== undefined && (
                                                <p className="text-xs text-brand-gold mt-0.5">₹{book.price}</p>
                                            )}
                                            <div className="flex gap-1.5 mt-1.5">
                                                <button
                                                    onClick={() => { setActiveBook(book._id || book.id); setOpen(false); }}
                                                    className="flex items-center gap-1 text-xs bg-black/[0.05] hover:bg-black/[0.09] text-[#5c4a30] px-2 py-0.5 rounded-lg transition"
                                                >
                                                    <Eye className="w-3 h-3" /> View
                                                </button>
                                                <button
                                                    onClick={() => { addToCart({ ...book, mode: 'buy' }); toast.success('Added to cart'); }}
                                                    className="flex items-center gap-1 text-xs bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold px-2 py-0.5 rounded-lg transition"
                                                >
                                                    <ShoppingCart className="w-3 h-3" /> Buy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && preview && results.length === 0 && (
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="w-full py-2 text-xs text-brand-gold border border-brand-gold/30 rounded-xl hover:bg-brand-gold/10 transition flex items-center justify-center gap-2"
                            >
                                <Search className="w-3.5 h-3.5" /> Try another image
                                <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Toggle button */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-12 h-12 bg-brand-soft border border-brand-gold/30 text-brand-gold rounded-full shadow-lg hover:bg-brand-gold/10 hover:border-brand-gold/60 transition flex items-center justify-center widget-btn"
                title="Visual Book Search"
            >
                {open ? <X className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </button>
        </div>
    );
}
