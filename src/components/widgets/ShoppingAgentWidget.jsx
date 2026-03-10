import React, { useState } from 'react';
import { ShoppingBag, X, Send, Bot, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { processShoppingQuery, placeOrder, createRazorpayOrder, verifyPayment } from '../../lib/api';
import { money } from '../../lib/utils';

export default function ShoppingAgentWidget() {
    const { token, user, shoppingAgentOpen: open, toggleShoppingAgent } = useStore();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [ordering, setOrdering] = useState(false);
    const [ordered, setOrdered] = useState(false);

    if (!token) return null;

    async function handleSearch(e) {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setResult(null);
        setOrdered(false);
        try {
            const res = await processShoppingQuery(token, query.trim());
            setResult(res);
            setQuery('');
        } catch (e) {
            toast.error(e.message || 'Shopping agent error');
        } finally {
            setLoading(false);
        }
    }

    async function handlePlaceOrder() {
        if (!result?.orderData) { toast.error('No order data available'); return; }
        setOrdering(true);
        try {
            if (result.paymentMethod === 'cod') {
                await placeOrder(token, result.orderData);
                setOrdered(true);
                toast.success('Order placed! 🎉');
            } else {
                // Razorpay flow
                if (!window.Razorpay) { toast.error('Razorpay not loaded'); setOrdering(false); return; }
                const res = await placeOrder(token, result.orderData);
                const oid = res?.order?.id || res?.order_id || res?.id;
                if (!oid) { toast.error('Failed to create order'); setOrdering(false); return; }
                const paymentOrder = await createRazorpayOrder(token, result.pricing?.total || 0, oid);
                if (!paymentOrder?.orderId) { toast.error('Payment order creation failed'); setOrdering(false); return; }

                const options = {
                    key: paymentOrder.key || import.meta.env.VITE_RAZORPAY_KEY || '',
                    amount: paymentOrder.amount,
                    currency: paymentOrder.currency || 'INR',
                    name: 'BookNook',
                    description: 'Book order payment',
                    order_id: paymentOrder.orderId,
                    handler: async (response) => {
                        try {
                            await verifyPayment(token, response, oid);
                            setOrdered(true);
                            toast.success('Payment successful! 🎉');
                        } catch { toast.error('Payment verification failed'); }
                    },
                    prefill: { name: user?.name, email: user?.email },
                    theme: { color: '#d4af37' },
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            }
        } catch (e) {
            toast.error(e.message || 'Order failed');
        } finally {
            setOrdering(false);
        }
    }

    function handleReset() {
        setQuery('');
        setResult(null);
        setOrdered(false);
    }

    return (
        <>
            {/* Panel */}
            {open && (
                <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.07]" style={{ background: 'rgba(160,120,48,0.08)' }}>
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-brand-gold" />
                            <span className="text-sm font-semibold text-[#1a1208]">Shopping Agent</span>
                        </div>
                        <button onClick={toggleShoppingAgent} className="text-[#8a7560] hover:text-[#1a1208] transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-3">
                        {!result && !loading && (
                            <div className="text-center py-4">
                                <Bot className="w-10 h-10 text-[#a07830]/40 mx-auto mb-2" />
                                <p className="text-xs text-muted">Describe what you want and I&apos;ll handle the order for you.</p>
                                <p className="text-xs text-[#8a7560]/60 mt-1">e.g. &quot;buy Harry Potter with COD&quot;</p>
                                <p className="text-xs text-[#8a7560]/60">e.g. &quot;rent Atomic Habits for 30 days&quot;</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {result && !ordered && (
                            <div className="space-y-3">
                                {result.success && result.book ? (
                                    <>
                                        {/* Book card */}
                                        <div className="flex gap-3 p-3 rounded-xl bg-white/5">
                                            {result.book.image_url && (
                                                <img src={result.book.image_url} alt={result.book.title} className="w-12 h-16 rounded object-cover flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white line-clamp-2">{result.book.title}</p>
                                                <p className="text-xs text-muted">{result.book.author}</p>
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-muted">Book price</span>
                                                <span className="text-white">{money(result.pricing?.bookPrice || result.pricing?.finalPrice || 0)}</span>
                                            </div>
                                            {result.pricing?.shippingFee > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted">Shipping</span>
                                                    <span className="text-white">+{money(result.pricing.shippingFee)}</span>
                                                </div>
                                            )}
                                            {result.pricing?.codFee > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted">COD fee</span>
                                                    <span className="text-white">+{money(result.pricing.codFee)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-semibold pt-1 border-t border-white/10">
                                                <span className="text-white">Total</span>
                                                <span className="text-brand-gold">{money(result.pricing?.total || 0)}</span>
                                            </div>
                                        </div>

                                        {result.deliveryInfo && <p className="text-xs text-muted">{result.deliveryInfo}</p>}
                                        {result.paymentInfo && <p className="text-xs text-muted">{result.paymentInfo}</p>}

                                        <button
                                            onClick={handlePlaceOrder}
                                            disabled={ordering}
                                            className="w-full py-2 px-4 rounded-lg bg-brand-crimson hover:bg-brand-crimson/90 text-white text-sm font-semibold transition disabled:opacity-50"
                                        >
                                            {ordering ? 'Placing…' : result.paymentMethod === 'cod' ? 'Place Order (COD)' : 'Proceed to Payment'}
                                        </button>
                                        <button onClick={handleReset} className="w-full text-xs text-muted hover:text-[#1a1208] transition">
                                            Try another query
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center py-2">
                                        <p className="text-sm text-white/80">{result.message || 'Could not process request'}</p>
                                        <button onClick={handleReset} className="mt-3 text-xs text-brand-gold hover:underline">Try again</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {ordered && (
                            <div className="text-center py-4 space-y-2">
                                <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                                <p className="text-sm font-semibold text-white">Order placed!</p>
                                <button onClick={handleReset} className="text-xs text-brand-gold hover:underline">New order</button>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    {!ordered && (
                        <form onSubmit={handleSearch} className="flex gap-2 p-3 border-t border-black/[0.07]">
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder='e.g. "buy Harry Potter, COD"'
                                className="flex-1 bg-brand-soft border border-black/[0.08] rounded-lg px-3 py-2 text-xs text-[#1a1208] placeholder-[rgba(92,74,48,0.45)] focus:outline-none focus:border-brand-gold/50"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="p-2 rounded-lg bg-brand-crimson text-white hover:bg-brand-crimson/90 disabled:opacity-40 transition"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}
