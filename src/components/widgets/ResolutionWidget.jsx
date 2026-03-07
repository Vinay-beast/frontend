import React, { useState, useEffect, useRef } from 'react';
import { HeadphonesIcon, X, Send, AlertCircle, CheckCircle, RefreshCcw, ChevronDown, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { processResolutionQuery, getPaymentIssues, resolvePayment, simulatePaymentFailure } from '../../lib/api';

export default function ResolutionWidget() {
    const { token } = useStore();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('chat'); // 'chat' | 'issues'
    const [messages, setMessages] = useState([{ role: 'bot', text: 'Hi! I can help resolve order and payment issues. Describe your problem or check pending issues below.' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        if (open && tab === 'issues') loadIssues();
    }, [open, tab]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadIssues() {
        if (!token) return;
        setIssuesLoading(true);
        try {
            const res = await getPaymentIssues(token);
            setIssues(Array.isArray(res) ? res : res?.issues || []);
        } catch { } finally { setIssuesLoading(false); }
    }

    async function sendMessage() {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        setMessages(m => [...m, { role: 'user', text }]);
        setLoading(true);
        try {
            const res = await processResolutionQuery(token, text);
            const reply = res?.response || res?.resolution || res?.message || 'I\'ve logged your issue. Our team will look into it within 24 hours.';
            const action = res?.showActionButton
                ? { type: res.actionType, label: res.actionButtonText, orderId: res.failedOrders?.[0]?.id }
                : null;
            setMessages(m => [...m, { role: 'bot', text: reply, action }]);
        } catch {
            setMessages(m => [...m, { role: 'bot', text: 'Unable to process your request right now. Please try again shortly.' }]);
        } finally { setLoading(false); }
    }

    async function handleResolve(orderId) {
        try {
            await resolvePayment(token, orderId);
            toast.success('Payment issue resolved');
            loadIssues();
        } catch (e) { toast.error(e.message || 'Failed to resolve'); }
    }

    async function handleSimulate() {
        try {
            await simulatePaymentFailure(token);
            toast.success('Payment failure simulated — check Issues tab');
            setTab('issues');
            loadIssues();
        } catch (e) { toast.error(e.message || 'Simulation failed'); }
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    }

    const statusColor = s =>
        s === 'resolved' ? 'text-green-400' : s === 'failed' ? 'text-red-400' : 'text-yellow-400';

    return (
        <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
            {/* Panel */}
            {open && (
                <div className="w-80 sm:w-96 bg-brand-panel border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in" style={{ maxHeight: '460px' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-soft to-brand-crimson/30 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <HeadphonesIcon className="w-5 h-5 text-brand-gold" />
                            <div>
                                <p className="text-sm font-semibold text-white">Support Center</p>
                                <p className="text-xs text-white/50">Order & payment issues</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        {['chat', 'issues'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 text-xs font-medium capitalize transition ${tab === t ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-muted hover:text-white'}`}
                            >
                                {t === 'chat' ? 'Chat Support' : 'Payment Issues'}
                            </button>
                        ))}
                    </div>

                    {/* Chat tab */}
                    {tab === 'chat' && (
                        <>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '300px' }}>
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${m.role === 'user' ? 'bg-brand-gold/20 text-brand-gold' : 'bg-brand-crimson/30 text-red-300'
                                            }`}>
                                            {m.role === 'user' ? 'U' : 'S'}
                                        </div>
                                        <div className={`max-w-[78%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === 'user'
                                                ? 'bg-brand-gold/20 text-white rounded-tr-none'
                                                : 'bg-brand-soft text-white/80 rounded-tl-none'
                                            }`}>
                                            <span dangerouslySetInnerHTML={{ __html: m.text }} />
                                            {m.action && (
                                                <button
                                                    onClick={async () => {
                                                        if (m.action.type === 'resolve_payment' && m.action.orderId) {
                                                            await handleResolve(m.action.orderId);
                                                        } else if (m.action.type === 'view_order') {
                                                            setOpen(false); navigate('/orders');
                                                        } else {
                                                            setOpen(false); navigate('/catalog');
                                                        }
                                                    }}
                                                    className="mt-2 block w-full text-center bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg px-2 py-1 transition"
                                                >
                                                    {m.action.label || 'Browse & Order'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full bg-brand-crimson/30 flex items-center justify-center text-xs text-red-300 flex-shrink-0">S</div>
                                        <div className="bg-brand-soft rounded-xl rounded-tl-none px-3 py-2">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={endRef} />
                            </div>
                            <div className="flex items-center gap-2 p-3 border-t border-white/10">
                                <input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKey}
                                    placeholder="Describe your issue..."
                                    className="flex-1 bg-brand-dark text-sm text-white placeholder-white/30 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-gold/50 transition"
                                />
                                <button onClick={sendMessage} disabled={!input.trim() || loading}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-crimson text-white hover:opacity-90 transition disabled:opacity-40 flex-shrink-0">
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* Issues tab */}
                    {tab === 'issues' && (
                        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '340px' }}>
                            <div className="flex items-center justify-between px-3 pt-3 pb-1">
                                <span className="text-xs text-muted">{issues.length} issue{issues.length !== 1 ? 's' : ''} found</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setOpen(false); navigate('/catalog'); }}
                                        className="text-xs text-brand-gold hover:text-brand-gold/80 transition px-2 py-1 rounded-lg border border-brand-gold/20 hover:bg-brand-gold/10 flex items-center gap-1"
                                        title="Browse books and place a new order"
                                    >
                                        <ShoppingBag className="w-3 h-3" /> New Order
                                    </button>
                                    <button onClick={loadIssues} className="pdf-reader-ctrl" title="Refresh"><RefreshCcw className="w-3.5 h-3.5" /></button>
                                    <button onClick={handleSimulate} className="text-xs text-yellow-400 hover:text-yellow-300 transition px-2 py-1 rounded-lg border border-yellow-400/20 hover:bg-yellow-400/10">
                                        Simulate Failure
                                    </button>
                                </div>
                            </div>

                            {issuesLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : issues.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                    <p className="text-sm text-muted">No payment issues found</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {issues.map((issue, i) => (
                                        <div key={issue.id || i} className="bg-brand-dark rounded-xl p-3 border border-white/5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">Order #{issue.order_id || issue.id}</p>
                                                    <p className="text-xs text-muted mt-0.5 truncate">{issue.description || issue.reason || 'Payment failure'}</p>
                                                    <p className={`text-xs font-medium mt-1 capitalize ${statusColor(issue.status)}`}>{issue.status || 'pending'}</p>
                                                </div>
                                                {issue.status !== 'resolved' && (
                                                    <button
                                                        onClick={() => handleResolve(issue.order_id || issue.id)}
                                                        className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition px-2 py-1 rounded-lg flex-shrink-0"
                                                    >
                                                        Resolve
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Toggle button */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-14 h-14 bg-brand-crimson text-white rounded-full shadow-lg hover:opacity-90 transition flex items-center justify-center widget-btn"
                title="Support Center"
            >
                {open ? <X className="w-6 h-6" /> : <HeadphonesIcon className="w-6 h-6" />}
            </button>
        </div>
    );
}
