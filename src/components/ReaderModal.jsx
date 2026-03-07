import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { getBookReadingAccess, saveReadingProgress, getBookProgress, generateBookSummary } from '../lib/api';

function SummaryMarkdown({ text }) {
    if (!text) return null;
    function parseInline(str) {
        const result = [];
        let key = 0;
        const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
        parts.forEach(part => {
            if (part.startsWith('**') && part.endsWith('**'))
                result.push(<strong key={key++}>{part.slice(2, -2)}</strong>);
            else if (part.startsWith('*') && part.endsWith('*'))
                result.push(<em key={key++}>{part.slice(1, -1)}</em>);
            else if (part.startsWith('`') && part.endsWith('`'))
                result.push(<code key={key++} className="bg-black/[0.07] px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>);
            else if (part) result.push(<span key={key++}>{part}</span>);
        });
        return result;
    }
    const lines = text.split('\n');
    const elements = [];
    let listItems = [];
    function pushList() {
        if (!listItems.length) return;
        elements.push(<ul key={`ul${elements.length}`} className="list-disc pl-5 space-y-1.5 my-2 text-sm" style={{ color: '#2a1f14' }}>{listItems.map((item, i) => <li key={i}>{parseInline(item)}</li>)}</ul>);
        listItems = [];
    }
    lines.forEach((line, idx) => {
        const trim = line.trim();
        if (/^---+$/.test(trim)) { pushList(); elements.push(<hr key={idx} className="my-3" style={{ borderColor: 'rgba(160,120,48,0.20)' }} />); }
        else if (trim.startsWith('### ')) { pushList(); elements.push(<h4 key={idx} className="text-xs font-bold uppercase tracking-widest mt-4 mb-1" style={{ color: '#a07830' }}>{parseInline(trim.slice(4))}</h4>); }
        else if (trim.startsWith('## ')) { pushList(); elements.push(<h3 key={idx} className="text-sm font-bold mt-4 mb-1" style={{ color: '#1a1208' }}>{parseInline(trim.slice(3))}</h3>); }
        else if (trim.startsWith('# ')) { pushList(); elements.push(<h2 key={idx} className="text-base font-extrabold mt-3 mb-1" style={{ color: '#1a1208' }}>{parseInline(trim.slice(2))}</h2>); }
        else if (/^[-*•]\s+/.test(trim)) { listItems.push(trim.replace(/^[-*•]\s+/, '')); }
        else if (trim === '') { pushList(); if (elements.length) elements.push(<div key={`sp${idx}`} className="h-1.5" />); }
        else { pushList(); elements.push(<p key={idx} className="text-sm leading-relaxed" style={{ color: '#2a1f14' }}>{parseInline(trim)}</p>); }
    });
    pushList();
    return <>{elements}</>;
}

export default function ReaderModal() {
    const { readerBookId, closeReader, token } = useStore();
    const [pdfUrl, setPdfUrl] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [pdfLoaded, setPdfLoaded] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [summary, setSummary] = useState('');
    const [summaryPage, setSummaryPage] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [blurred, setBlurred] = useState(false);
    const [bookTitle, setBookTitle] = useState('');
    const canvasRef = useRef(null);
    const pdfRef = useRef(null);
    const saveTimerRef = useRef(null);

    // Load PDF when modal opens
    useEffect(() => {
        if (!readerBookId) return;
        setLoading(true);
        setCurrentPage(1);
        setTotalPages(0);
        setPdfUrl(null);
        setPdfLoaded(false);
        setSummary('');
        setSummaryPage(null);
        setShowSummary(false);
        setBlurred(false);
        pdfRef.current = null;

        getBookReadingAccess(token, readerBookId)
            .then(data => {
                if (!data?.readingUrl && !data?.title) { toast.error(data?.message || 'No reading access'); closeReader(); return; }
                // Use backend proxy to avoid Azure CORS issues
                setPdfUrl(`/api/secure-reader/${readerBookId}?token=${encodeURIComponent(token)}`);
                setBookTitle(data.title || '');
                // Restore progress
                return getBookProgress(token, readerBookId).then(p => {
                    if (p?.current_page) setCurrentPage(p.current_page);
                    if (p?.total_pages) setTotalPages(p.total_pages);
                }).catch(() => { });
            })
            .catch(e => { toast.error(e.message || 'Failed to load book'); closeReader(); })
            .finally(() => setLoading(false));
    }, [readerBookId]);

    // Render PDF page using PDF.js (CDN)
    const renderPage = useCallback(async (pageNum) => {
        if (!pdfRef.current || !canvasRef.current) return;
        setRendering(true);
        try {
            const page = await pdfRef.current.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
        } catch { } finally { setRendering(false); }
    }, [scale]);

    // Load PDF.js and render when url is ready
    useEffect(() => {
        if (!pdfUrl) return;

        async function loadPdf() {
            try {
                // PDF.js loaded via CDN in index.html window.pdfjsLib
                let lib = window.pdfjsLib;
                if (!lib) {
                    await new Promise((res, rej) => {
                        const s = document.createElement('script');
                        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                        s.onload = res; s.onerror = rej;
                        document.head.appendChild(s);
                    });
                    lib = window.pdfjsLib;
                }
                lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const pdf = await lib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
                pdfRef.current = pdf;
                setTotalPages(pdf.numPages);
                setPdfLoaded(true);
            } catch (e) { console.error('PDF load error:', e); toast.error('Failed to load PDF'); }
        }

        loadPdf();
    }, [pdfUrl]);

    // Re-render on page/scale change
    useEffect(() => {
        if (pdfRef.current) renderPage(currentPage);
    }, [currentPage, scale, pdfLoaded]);

    // Auto-save progress
    useEffect(() => {
        if (!token || !readerBookId || !totalPages) return;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveReadingProgress(token, readerBookId, currentPage, totalPages).catch(() => { });
        }, 2000);
        return () => clearTimeout(saveTimerRef.current);
    }, [currentPage, totalPages]);

    function goPage(n) {
        const p = Math.max(1, Math.min(n, totalPages));
        setCurrentPage(p);
    }

    async function handleSummary() {
        setSummaryLoading(true);
        setShowSummary(false);
        try {
            const res = await generateBookSummary(token, readerBookId, currentPage, currentPage);
            setSummary(res?.summary || res?.content || 'No summary available.');
            setSummaryPage(currentPage);
            setShowSummary(true);
        } catch (e) { toast.error(e.message || 'Summary failed'); }
        finally { setSummaryLoading(false); }
    }

    // Keyboard nav
    useEffect(() => {
        function h(e) {
            if (!readerBookId) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goPage(currentPage + 1);
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPage(currentPage - 1);
            if (e.key === 'Escape') closeReader();
        }
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [currentPage, readerBookId]);

    if (!readerBookId) return null;

    return (
        <div
            className={`fixed inset-0 z-50 bg-brand-dark flex flex-col ${fullscreen ? '' : ''}`}
            onCopy={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
        >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-black/[0.08] gap-3" style={{ boxShadow: '0 1px 4px rgba(120,90,50,0.06)' }}>
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={closeReader} className="p-1.5 rounded-lg transition" style={{ color: 'rgba(42,31,20,0.50)' }} onMouseEnter={e => e.currentTarget.style.color = '#2a1f14'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(42,31,20,0.50)'}><X className="w-4 h-4" /></button>
                    <span className="text-sm font-medium truncate" style={{ color: '#2a1f14' }}>{bookTitle || 'Reading'}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="pdf-reader-ctrl" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs text-muted w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="pdf-reader-ctrl" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={() => setScale(1.0)} className="pdf-reader-ctrl" title="Reset zoom"><RotateCcw className="w-4 h-4" /></button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button onClick={handleSummary} disabled={summaryLoading} className="pdf-reader-ctrl" title="AI Summary for current page">
                        <Cpu className={`w-4 h-4 ${summaryLoading ? 'animate-pulse text-brand-gold' : ''}`} />
                    </button>
                    <button onClick={() => setFullscreen(v => !v)} className="pdf-reader-ctrl" title="Fullscreen">
                        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button onClick={closeReader} className="pdf-reader-ctrl text-red-400"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Page area */}
            <div className="flex-1 overflow-hidden flex flex-row">

                {/* LEFT sidebar: AI Summary (non-overlapping) */}
                {showSummary && summary && (
                    <div className="w-[420px] shrink-0 flex flex-col border-r border-brand-gold/25 overflow-hidden" style={{ background: 'rgb(var(--brand-soft))' }}>
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-brand-gold/20 shrink-0 bg-brand-panel/60">
                            <Cpu className="w-4 h-4 text-brand-gold shrink-0" />
                            <span className="text-xs font-semibold text-brand-gold flex-1">AI Summary — Page {summaryPage}</span>
                            <button onClick={() => handleSummary()} disabled={summaryLoading} title="Refresh summary" className="text-muted hover:text-brand-gold transition text-xs px-1">↺</button>
                            <button onClick={() => setShowSummary(false)} className="ml-1 text-muted hover:text-brand-gold transition"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="overflow-y-auto px-4 py-3 flex-1">
                            <SummaryMarkdown text={summary} />
                        </div>
                    </div>
                )}

                {/* RIGHT: PDF canvas */}
                <div className="flex-1 overflow-auto flex items-start justify-center p-4 relative">
                    {loading ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className="w-10 h-10 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : pdfUrl ? (
                        <div
                            className="relative"
                            onContextMenu={e => { e.preventDefault(); setBlurred(true); setTimeout(() => setBlurred(false), 1500); }}
                        >
                            <canvas ref={canvasRef} className={`shadow-2xl rounded transition-all duration-300 ${blurred ? 'blur-xl select-none' : ''}`} style={{ userSelect: 'none', WebkitUserSelect: 'none' }} />
                            {rendering && (
                                <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/60 rounded">
                                    <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            {blurred && (
                                <div className="absolute inset-0 flex items-center justify-center rounded bg-brand-dark/80">
                                    <p className="text-sm" style={{ color: 'rgba(42,31,20,0.55)' }}>Protected content</p>
                                </div>
                            )}
                        </div>
                    ) : !loading && (
                        <div className="text-center text-muted py-20">
                            <p>No PDF content available for this book.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom navigation */}
            {totalPages > 0 && (
                <div className="flex items-center justify-center gap-3 px-4 py-3 bg-white border-t border-black/[0.08]">
                    <button onClick={() => goPage(1)} disabled={currentPage === 1} className="pdf-reader-ctrl disabled:opacity-30">⏮</button>
                    <button onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1} className="pdf-reader-ctrl disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="number" min={1} max={totalPages} value={currentPage}
                            onChange={e => goPage(Number(e.target.value))}
                            className="w-14 text-center bg-brand-dark border border-black/10 rounded-lg py-1 text-sm focus:outline-none focus:border-brand-gold/60 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                        <span className="text-muted text-sm">/ {totalPages}</span>
                    </div>

                    <button onClick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages} className="pdf-reader-ctrl disabled:opacity-30">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => goPage(totalPages)} disabled={currentPage === totalPages} className="pdf-reader-ctrl disabled:opacity-30">⏭</button>

                    {/* Progress */}
                    <div className="hidden sm:flex items-center gap-2 ml-4">
                        <div className="w-32 progress-track">
                            <div className="progress-fill" style={{ width: `${Math.round((currentPage / totalPages) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted">{Math.round((currentPage / totalPages) * 100)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}
