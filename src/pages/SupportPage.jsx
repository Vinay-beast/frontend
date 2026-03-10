import React, { useState, useEffect, useRef } from 'react';
import { HeadphonesIcon, Send, CheckCircle, RefreshCcw, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { processResolutionQuery, getPaymentIssues, resolvePayment, simulatePaymentFailure } from '../lib/api';

const QUICK_ACTIONS = [
    { label: '\uD83D\uDCB3 Payment Issue', text: 'I have a payment issue with my recent order' },
    { label: '\uD83D\uDCE6 Order Status', text: 'What is the status of my order?' },
    { label: '\uD83D\uDD70 Last Order', text: 'Show me details about my last order' },
];

export default function SupportPage() {
    const { token } = useStore();
    const navigate = useNavigate();
    const [tab, setTab] = useState('chat');
    const [messages, setMessages] = useState([{ role: 'bot', text: 'Hi! I can help resolve order and payment issues. Describe your problem or use the quick actions below.' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [resolving, setResolving] = useState(null); // orderId being resolved
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        if (tab === 'issues') loadIssues();
    }, [tab]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadIssues() {
        if (!token) return;
        setIssuesLoading(true);
        try {
            const res = await getPaymentIssues(token);
            setIssues(Array.isArray(res) ? res : res?.orders || res?.issues || []);
        } catch { } finally { setIssuesLoading(false); }
    }

    async function sendMessage(presetText) {
        const msg = (presetText || input).trim();
        if (!msg || loading) return;
        setInput('');
        setMessages(m => [...m, { role: 'user', text: msg }]);
        setLoading(true);
        try {
            const res = await processResolutionQuery(token, msg);
            const reply = res?.response || res?.resolution || res?.message || "I've logged your issue. Our team will look into it within 24 hours.";
            const action = res?.showActionButton
                ? { type: res.actionType, label: res.actionButtonText, orderId: res.failedOrders?.[0]?.id }
                : null;
            setMessages(m => [...m, { role: 'bot', text: reply, action }]);
        } catch {
            setMessages(m => [...m, { role: 'bot', text: 'Unable to process your request right now. Please try again shortly.' }]);
        } finally { setLoading(false); }
    }

    async function handleResolve(orderId) {
        setResolving(orderId);
        try {
            await resolvePayment(token, orderId);
            toast.success('Payment issue resolved');
            loadIssues();
        } catch (e) { toast.error(e.message || 'Failed to resolve'); }
        finally { setResolving(null); }
    }

    async function handleSimulate() {
        setSimulating(true);
        try {
            await simulatePaymentFailure(token);
            toast.success('Payment failure simulated — check Issues tab');
            setTab('issues');
            loadIssues();
        } catch (e) { toast.error(e.message || 'Simulation failed'); }
        finally { setSimulating(false); }
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    }

    const statusColor = s =>
        s === 'resolved' ? '#16a34a' : s === 'failed' ? '#dc2626' : '#ca8a04';

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div
                className="rounded-2xl overflow-hidden shadow-lg flex flex-col"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-3 px-5 py-4"
                    style={{ background: 'rgba(160,120,48,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(160,120,48,0.14)' }}>
                        <HeadphonesIcon className="w-5 h-5" style={{ color: '#a07830' }} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#1a1208' }}>Resolution Agent</p>

                    </div>
                </div>

                {/* Tabs */}
                <div className="flex" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    {[{ id: 'chat', label: 'Chat Support' }, { id: 'issues', label: 'Payment Issues' }].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className="flex-1 py-2.5 text-xs font-medium capitalize transition"
                            style={tab === t.id
                                ? { color: '#a07830', borderBottom: '2px solid #a07830' }
                                : { color: '#8a7560' }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Chat tab */}
                {tab === 'chat' && (
                    <>
                        <div
                            className="overflow-y-auto p-4 space-y-3"
                            style={{ minHeight: '280px', maxHeight: '340px' }}
                        >
                            {messages.map((m, i) => (
                                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                        style={m.role === 'user'
                                            ? { background: 'rgba(160,120,48,0.18)', color: '#a07830' }
                                            : { background: 'rgba(184,92,74,0.13)', color: '#b85c4a' }}
                                    >
                                        {m.role === 'user' ? 'U' : 'S'}
                                    </div>
                                    <div
                                        className="max-w-[78%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                                        style={m.role === 'user'
                                            ? { background: 'rgba(160,120,48,0.12)', color: '#1a1208', borderRadius: '12px 0 12px 12px' }
                                            : { background: '#f5f0e8', color: '#2a1f14', borderRadius: '0 12px 12px 12px' }}
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: m.text }} />
                                        {m.action && (
                                            <button
                                                onClick={async () => {
                                                    if (m.action.type === 'resolve_payment' && m.action.orderId) {
                                                        await handleResolve(m.action.orderId);
                                                    } else if (m.action.type === 'view_order') {
                                                        navigate('/orders');
                                                    } else {
                                                        navigate('/catalog');
                                                    }
                                                }}
                                                disabled={resolving === m.action.orderId}
                                                className="mt-2 block w-full text-center rounded-lg px-2 py-1 text-xs transition disabled:opacity-60"
                                                style={{ background: 'rgba(160,120,48,0.12)', color: '#a07830', border: '1px solid rgba(160,120,48,0.20)' }}
                                            >
                                                {resolving === m.action.orderId ? '⏳ Resolving…' : (m.action.label || 'Browse & Order')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-2">
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                                        style={{ background: 'rgba(184,92,74,0.13)', color: '#b85c4a' }}
                                    >S</div>
                                    <div className="rounded-xl rounded-tl-none px-3 py-2" style={{ background: '#f5f0e8' }}>
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-[#a07830]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-[#a07830]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-[#a07830]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>

                        {/* Quick action chips */}
                        <div className="px-4 pb-3 flex flex-wrap gap-2">
                            {QUICK_ACTIONS.map(a => (
                                <button
                                    key={a.label}
                                    onClick={() => sendMessage(a.text)}
                                    className="text-xs px-3 py-1.5 rounded-full transition hover:opacity-80"
                                    style={{ background: 'rgba(160,120,48,0.08)', color: '#5c4a30', border: '1px solid rgba(160,120,48,0.20)' }}
                                >
                                    {a.label}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <div
                            className="flex items-center gap-2 px-4 pb-4 pt-3"
                            style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
                        >
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="Describe your issue..."
                                className="flex-1 rounded-xl px-3 py-2 text-sm transition focus:outline-none"
                                style={{ background: '#faf8f4', border: '1px solid rgba(0,0,0,0.09)', color: '#1a1208' }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className="w-10 h-10 flex items-center justify-center rounded-xl transition disabled:opacity-40 flex-shrink-0"
                                style={{ background: '#b85c4a', color: '#fff' }}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                )}

                {/* Issues tab */}
                {tab === 'issues' && (
                    <div className="overflow-y-auto" style={{ minHeight: '300px', maxHeight: '460px' }}>
                        <div className="flex items-center justify-between px-4 pt-4 pb-2">
                            <span className="text-xs" style={{ color: '#8a7560' }}>{issues.length} issue{issues.length !== 1 ? 's' : ''} found</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate('/catalog')}
                                    className="text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition hover:opacity-80"
                                    style={{ color: '#a07830', border: '1px solid rgba(160,120,48,0.25)', background: 'rgba(160,120,48,0.06)' }}
                                >
                                    <ShoppingBag className="w-3 h-3" /> New Order
                                </button>
                                <button
                                    onClick={loadIssues}
                                    className="p-1.5 rounded-lg transition hover:opacity-80"
                                    style={{ color: '#8a7560', background: 'rgba(0,0,0,0.04)' }}
                                    title="Refresh"
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Simulate failure */}
                        <div className="px-4 pb-3">
                            <button
                                onClick={handleSimulate}
                                disabled={simulating}
                                className="w-full py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-70"
                                style={{ background: 'rgba(160,120,48,0.08)', border: '1px solid rgba(160,120,48,0.25)', color: '#a07830' }}
                            >
                                {simulating ? '⏳ Simulating…' : '⚠ Simulate Payment Failure (Demo)'}
                            </button>
                        </div>

                        {issuesLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
                            </div>
                        ) : issues.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <p className="text-sm" style={{ color: '#8a7560' }}>No payment issues found</p>
                            </div>
                        ) : (
                            <div className="px-4 pb-4 space-y-2">
                                {issues.map((issue, i) => (
                                    <div key={issue.id || i} className="p-3 rounded-xl" style={{ background: '#faf8f4', border: '1px solid rgba(0,0,0,0.07)' }}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium truncate" style={{ color: '#1a1208' }}>Order #{issue.user_order_number || issue.order_id || issue.id}</p>
                                                <p className="text-xs mt-0.5 truncate" style={{ color: '#8a7560' }}>{issue.description || issue.reason || 'Payment failure'}</p>
                                                <p className="text-xs font-medium mt-1 capitalize" style={{ color: statusColor(issue.status) }}>{issue.status || 'pending'}</p>
                                            </div>
                                            {issue.status !== 'resolved' && (
                                                <button
                                                    onClick={() => handleResolve(issue.order_id || issue.id)}
                                                    disabled={resolving === (issue.order_id || issue.id)}
                                                    className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition hover:opacity-80 disabled:opacity-60"
                                                    style={{ background: 'rgba(22,163,74,0.10)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.22)' }}
                                                >
                                                    {resolving === (issue.order_id || issue.id) ? '⏳ Resolving…' : 'Resolve'}
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
        </div>
    );
}
