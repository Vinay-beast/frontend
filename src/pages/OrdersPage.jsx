import React, { useState, useEffect } from 'react';
import { Package, ChevronDown, ChevronUp, RefreshCw, BookOpen } from 'lucide-react';
import useStore from '../store/useStore';
import { getOrders, getBookById } from '../lib/api';
import { money, formatDate, calcETA, dedupeOrders } from '../lib/utils';

const STATUS_COLORS = {
    pending: 'bg-amber-100 text-amber-800 border border-amber-300',
    confirmed: 'bg-blue-100 text-blue-800 border border-blue-300',
    processing: 'bg-purple-100 text-purple-800 border border-purple-300',
    shipped: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
    out_for_delivery: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
    delivered: 'bg-green-100 text-green-800 border border-green-300',
    cancelled: 'bg-red-100 text-red-800 border border-red-300',
};

function OrderCard({ order, displayNum, bookImages = {} }) {
    const [expanded, setExpanded] = useState(false);
    const status = (order.status || 'pending').toLowerCase();
    const statusClass = STATUS_COLORS[status] || 'bg-black/[0.06] border border-black/10';
    const items = order.items || order.order_items || [];
    const eta = calcETA(order);

    return (
        <div className="card overflow-hidden">
            <div className="p-4 flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">Order #{displayNum}</span>
                        <span className={`tag text-xs ${statusClass}`}>{status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-muted text-xs mt-1">{formatDate(order.created_at)} · {items.length} item{items.length !== 1 ? 's' : ''}</p>
                    {eta && status !== 'delivered' && status !== 'cancelled' && (
                        <p className="text-xs text-brand-gold mt-1">Estimated delivery: {formatDate(eta)}</p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="price-text font-bold text-base flex-shrink-0">{money(order.total_amount || order.total || 0)}</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-white/10 p-4">
                    {/* Progress bar */}
                    {!['delivered', 'cancelled'].includes(status) && (
                        <div className="mb-4">
                            {(() => {
                                const stages = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                                const idx = stages.indexOf(status);
                                const pct = Math.round(((idx + 1) / stages.length) * 100);
                                return (
                                    <>
                                        <div className="progress-track mb-1">
                                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted">
                                            <span>Order placed</span>
                                            <span>Delivered</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Items */}
                    <div className="space-y-3">
                        {items.length === 0 && <p className="text-muted text-sm">No item details</p>}
                        {items.map((item, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <div className="w-14 h-20 rounded-lg bg-brand-soft flex-shrink-0 overflow-hidden border border-black/[0.06]">
                                    {(item.image_url || bookImages[item.book_id]) ? <img src={item.image_url || bookImages[item.book_id]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4 text-brand-gold/30" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium truncate">{item.title || item.book_title || (item.book_id ? `Book #${item.book_id}` : 'Book')}</p>
                                    <p className="text-xs text-muted">{item.mode || item.purchase_type || 'Purchase'} × {item.qty || item.quantity || 1}</p>
                                </div>
                                <span className="text-sm text-white flex-shrink-0">{money(item.price || item.unit_price || 0)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Address */}
                    {order.shipping_address && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-muted mb-1">Delivery Address</p>
                            <p className="text-sm text-white/80">{order.shipping_address}</p>
                        </div>
                    )}

                    {/* Price breakdown */}
                    {(order.shipping_fee > 0 || order.cod_fee > 0) && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                            <p className="text-xs font-medium text-white/60 mb-2">Price Breakdown</p>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted">Book subtotal</span>
                                <span className="text-white">{money((order.subtotal) || ((order.total_amount || order.total || 0) - (order.shipping_fee || 0) - (order.cod_fee || 0)))}</span>
                            </div>
                            {order.shipping_fee > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted">Shipping{order.shipping_speed ? ` (${order.shipping_speed})` : ''}</span>
                                    <span className="text-white">+{money(order.shipping_fee)}</span>
                                </div>
                            )}
                            {order.cod_fee > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted">COD fee</span>
                                    <span className="text-white">+{money(order.cod_fee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs font-semibold pt-1 border-t border-white/10">
                                <span className="text-white">Total</span>
                                <span className="text-brand-gold">{money(order.total_amount || order.total || 0)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function OrdersPage() {
    const { token } = useStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [bookImages, setBookImages] = useState({});

    async function loadOrders() {
        setLoading(true);
        try {
            const res = await getOrders(token);
            const deduped = dedupeOrders(Array.isArray(res) ? res : (res?.orders || []));
            setOrders(deduped);

            // Fetch cover images for all unique book IDs (frontend-only, no backend change needed)
            const allItems = deduped.flatMap(o => o.items || o.order_items || []);
            const uniqueIds = [...new Set(allItems.map(i => i.book_id).filter(Boolean))];
            if (uniqueIds.length > 0) {
                const results = await Promise.all(uniqueIds.map(id => getBookById(id).catch(() => null)));
                const map = {};
                results.forEach((book, idx) => { if (book?.image_url) map[uniqueIds[idx]] = book.image_url; });
                setBookImages(map);
            }
        } catch { setOrders([]); }
        finally { setLoading(false); }
    }

    useEffect(() => { loadOrders(); }, []);

    const filters = ['all', 'pending', 'delivered', 'cancelled'];
    // Sort newest-first so latest order shows at top
    const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const numberedOrders = sortedOrders.map((o, i) => ({ ...o, _displayNum: i + 1 }));
    const filtered = filter === 'all' ? numberedOrders : numberedOrders.filter(o => (o.status || '').toLowerCase() === filter);

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-display text-3xl font-bold text-white">My Orders</h1>
                    <p className="text-muted text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
                </div>
                <button onClick={loadOrders} disabled={loading} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition disabled:opacity-40">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-none">
                {filters.map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? 'bg-brand-gold text-brand-dark' : 'text-muted hover:text-white hover:bg-white/5'}`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <Package className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-muted">No {filter !== 'all' ? filter : ''} orders found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(o => <OrderCard key={o.id || o.order_id} order={o} displayNum={o._displayNum} bookImages={bookImages} />)}
                </div>
            )}
        </div>
    );
}
