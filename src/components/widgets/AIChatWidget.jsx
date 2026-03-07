import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, ShoppingCart, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { chatRecommendation } from '../../lib/api';

const WELCOME = 'Hi! I\'m your AI book assistant. Ask me for recommendations, genre suggestions, or anything about our catalog!';

export default function AIChatWidget() {
    const { token, addToCart, setActiveBook, aiChatOpen: open, toggleAiChat } = useStore();
    const [messages, setMessages] = useState([{ role: 'bot', text: WELCOME }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                endRef.current?.scrollIntoView({ behavior: 'smooth' });
                inputRef.current?.focus();
            });
        }
    }, [open, messages]);

    async function send() {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        setMessages(m => [...m, { role: 'user', text }]);
        setLoading(true);
        try {
            const res = await chatRecommendation(token, text);
            const reply = res?.response || res?.message || res?.recommendation || 'I found some great options for you! Check out our catalog.';
            const recs = Array.isArray(res?.recommendations) ? res.recommendations : [];
            setMessages(m => [...m, { role: 'bot', text: reply, recommendations: recs }]);
        } catch (e) {
            setMessages(m => [...m, { role: 'bot', text: 'Sorry, I\'m having trouble right now. Try searching the catalog directly!' }]);
        } finally {
            setLoading(false);
        }
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    }

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
            {/* Chat panel */}
            {open && (
                <div className="w-80 sm:w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in" style={{ maxHeight: '440px', background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.07]" style={{ background: 'rgba(160,120,48,0.08)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-gold/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Book Assistant</p>
                                <p className="text-xs text-white/50">AI-powered recommendations</p>
                            </div>
                        </div>
                        <button onClick={toggleAiChat} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '300px' }}>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-brand-gold/20' : 'bg-brand-crimson/30'}`}>
                                    {m.role === 'user' ? <User className="w-3.5 h-3.5 text-brand-gold" /> : <Bot className="w-3.5 h-3.5 text-red-300" />}
                                </div>
                                <div className="max-w-[85%] space-y-2">
                                    <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === 'user'
                                        ? 'bg-brand-gold/20 text-white rounded-tr-none'
                                        : 'bg-brand-soft text-white/80 rounded-tl-none'
                                        }`}>
                                        {m.text}
                                    </div>
                                    {m.recommendations?.length > 0 && (
                                        <div className="space-y-1.5">
                                            {m.recommendations.map(book => {
                                                const score = book.match_score ?? 75;
                                                return (
                                                    <div
                                                        key={book.id}
                                                        className="flex gap-2 bg-brand-dark border border-white/5 hover:border-brand-gold/20 rounded-xl p-2 cursor-pointer transition"
                                                        onClick={() => { setActiveBook(book.id); toggleAiChat(); }}
                                                    >
                                                        {book.image_url ? (
                                                            <img src={book.image_url} alt={book.title} className="w-9 h-12 rounded-lg object-cover flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-9 h-12 rounded-lg bg-brand-soft flex items-center justify-center flex-shrink-0">
                                                                <BookOpen className="w-3.5 h-3.5 text-white/20" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0 space-y-0.5">
                                                            <p className="text-xs font-semibold text-white truncate">{book.title}</p>
                                                            <p className="text-xs text-muted truncate">{book.author}</p>
                                                            {book.recommendation_reason && (
                                                                <p className="text-xs text-brand-gold/70 truncate">{book.recommendation_reason}</p>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                                    <div className="h-1 bg-brand-gold rounded-full" style={{ width: `${score}%` }} />
                                                                </div>
                                                                <span className="text-xs text-muted flex-shrink-0">{score}%</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-brand-gold font-medium">₹{book.price}</span>
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); addToCart({ ...book, id: book.id }, 'buy'); toast.success('Added to cart!'); }}
                                                                    className="flex items-center gap-1 text-xs text-brand-gold hover:text-white bg-brand-gold/10 hover:bg-brand-gold/20 rounded-lg px-1.5 py-0.5 transition"
                                                                >
                                                                    <ShoppingCart className="w-2.5 h-2.5" /> Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand-crimson/30 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-3.5 h-3.5 text-red-300" />
                                </div>
                                <div className="bg-brand-soft rounded-xl rounded-tl-none px-3 py-2">
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

                    {/* Input */}
                    <div className="flex items-center gap-2 p-3 border-t border-black/[0.07]">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ask for a book recommendation..."
                            className="flex-1 bg-brand-soft text-sm text-[#1a1208] placeholder-[rgba(92,74,48,0.45)] border border-black/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-brand-gold/50 transition"
                        />
                        <button
                            onClick={send}
                            disabled={!input.trim() || loading}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-gold text-brand-dark hover:opacity-90 transition disabled:opacity-40 flex-shrink-0 font-bold"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
