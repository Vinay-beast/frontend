import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CreditCard, Truck, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { listAddresses, addAddress, deleteAddress, placeOrder, createRazorpayOrder, verifyPayment } from '../lib/api';
import { money } from '../lib/utils';

const STEPS = ['Cart Review', 'Address', 'Payment'];

const SHIPPING_OPTIONS = [
    { value: 'standard', label: 'Standard (5 days)', fee: 30 },
    { value: 'express', label: 'Express (3 days)', fee: 70 },
    { value: 'priority', label: 'Priority (1 day)', fee: 120 },
];

function rentFactor(days) {
    return days === 60 ? 0.50 : 0.35;
}

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { token, user, cart, clearCart } = useStore();
    const [step, setStep] = useState(0);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddr, setSelectedAddr] = useState(null);
    const [payMode, setPayMode] = useState('razorpay');
    const [shippingSpeed, setShippingSpeed] = useState('standard');
    const [loading, setLoading] = useState(false);
    const [addressLoading, setAddressLoading] = useState(false);
    const [newAddr, setNewAddr] = useState({ label: 'Home', recipient: '', street: '', city: '', state: '', zip: '' });
    const [showNewAddr, setShowNewAddr] = useState(false);
    const [placed, setPlaced] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [rentDaysMap, setRentDaysMap] = useState({});
    const [giftEmailMap, setGiftEmailMap] = useState({});

    const orderMode = cart[0]?.mode || 'buy';

    const subtotal = cart.reduce((s, c) => {
        const effectiveDays = c.mode === 'rent' ? (rentDaysMap[c.book.id] ?? c.rentDays ?? 30) : 30;
        const factor = c.mode === 'rent' ? rentFactor(effectiveDays) : 1;
        return s + c.book.price * factor * c.qty;
    }, 0);

    const shippingFee = orderMode === 'buy'
        ? (SHIPPING_OPTIONS.find(o => o.value === shippingSpeed)?.fee || 30)
        : 0;
    const codFee = (orderMode === 'buy' && payMode === 'cod') ? 10 : 0;
    const total = subtotal + shippingFee + codFee;

    useEffect(() => {
        if (token) loadAddresses();
    }, [token]);

    useEffect(() => {
        const rMap = {}; const gMap = {};
        cart.forEach(c => {
            if (c.mode === 'rent') rMap[c.book.id] = c.rentDays ?? 30;
            if (c.mode === 'gift') gMap[c.book.id] = c.giftEmail ?? '';
        });
        setRentDaysMap(rMap);
        setGiftEmailMap(gMap);
    }, []);

    // COD only available for buy mode
    useEffect(() => {
        if (orderMode !== 'buy' && payMode === 'cod') setPayMode('razorpay');
    }, [orderMode]);

    async function loadAddresses() {
        try {
            const list = await listAddresses(token);
            setAddresses(list);
            if (list.length > 0 && !selectedAddr) setSelectedAddr(list[0].id);
        } catch { }
    }

    async function handleAddAddress(e) {
        e.preventDefault();
        if (!newAddr.recipient || !newAddr.street || !newAddr.city) { toast.error('Fill required address fields'); return; }
        setAddressLoading(true);
        try {
            await addAddress(token, newAddr);
            await loadAddresses();
            setShowNewAddr(false);
            setNewAddr({ label: 'Home', recipient: '', street: '', city: '', state: '', zip: '' });
            toast.success('Address added');
        } catch (e) { toast.error(e.message || 'Failed to add address'); }
        finally { setAddressLoading(false); }
    }

    async function handleDeleteAddress(id) {
        try { await deleteAddress(token, id); await loadAddresses(); toast.success('Removed'); }
        catch { toast.error('Failed'); }
    }

    async function handlePlaceOrder() {
        if (!selectedAddr) { toast.error('Select a delivery address'); return; }
        if (cart.length === 0) { toast.error('Cart is empty'); return; }

        const orderPayload = {
            mode: orderMode,
            items: cart.map(c => ({ book_id: c.book.id, quantity: c.qty })),
            shipping_address_id: selectedAddr,
            payment_method: payMode,
            ...(orderMode === 'buy' && { shipping_speed: shippingSpeed }),
            ...(orderMode === 'rent' && { rental_duration: rentDaysMap[cart[0]?.book?.id] ?? cart[0]?.rentDays ?? 30 }),
            ...(orderMode === 'gift' && { gift_email: giftEmailMap[cart[0]?.book?.id] ?? cart[0]?.giftEmail ?? '' }),
        };

        setLoading(true);
        try {
            if (payMode === 'cod') {
                const res = await placeOrder(token, orderPayload);
                const oid = res?.order?.id || res?.order_id || res?.id;
                setOrderId(oid);
                setPlaced(true);
                clearCart();
                toast.success('Order placed! 🎉');
            } else {
                // Razorpay flow
                if (!window.Razorpay) { toast.error('Razorpay not loaded'); setLoading(false); return; }
                // Step 1: create order in DB
                const res = await placeOrder(token, orderPayload);
                const oid = res?.order?.id || res?.order_id || res?.id;
                if (!oid) { toast.error('Failed to create order'); setLoading(false); return; }
                // Step 2: create Razorpay payment order
                const paymentOrder = await createRazorpayOrder(token, total, oid);
                if (!paymentOrder?.orderId) { toast.error('Payment order creation failed'); setLoading(false); return; }

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
                            setOrderId(oid);
                            setPlaced(true);
                            clearCart();
                            toast.success('Payment successful! 🎉');
                        } catch { toast.error('Payment verification failed'); }
                    },
                    prefill: { name: user?.name, email: user?.email },
                    theme: { color: '#d4af37' },
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
                setLoading(false);
                return;
            }
        } catch (e) { toast.error(e.message || 'Order failed'); }
        finally { setLoading(false); }
    }

    if (placed) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">Order Placed!</h2>
                <p className="text-muted mb-2">Your order has been confirmed.</p>
                {orderId && <p className="text-sm text-brand-gold mb-6">Order #{orderId}</p>}
                <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate('/orders')} className="btn-primary">View Orders</button>
                    <button onClick={() => navigate('/catalog')} className="btn-secondary">Continue Shopping</button>
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <p className="text-muted text-lg mb-4">Your cart is empty</p>
                <button onClick={() => navigate('/catalog')} className="btn-primary">Browse Catalog</button>
            </div>
        );
    }

    const modeLabel = { buy: 'Purchase', rent: 'Rental', gift: 'Gift' }[orderMode] || orderMode;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="font-display text-3xl font-bold text-white mb-6">Checkout</h1>

            {/* Steps */}
            <div className="flex items-center gap-0 mb-8">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center gap-2 cursor-pointer ${i <= step ? 'text-brand-gold' : 'text-white/30'}`} onClick={() => i < step && setStep(i)}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${i < step ? 'bg-brand-gold border-brand-gold text-brand-dark' : i === step ? 'border-brand-gold text-brand-gold' : 'border-white/20 text-white/30'}`}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            <span className="text-sm font-medium hidden sm:block">{s}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 transition ${i < step ? 'bg-brand-gold' : 'bg-white/10'}`} />}
                    </React.Fragment>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main */}
                <div className="lg:col-span-2 space-y-4">
                    {step === 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold text-white">Review Cart</h2>
                                <span className="tag tag-gold text-xs">{modeLabel}</span>
                            </div>
                            {cart.map(item => {
                                const effectiveDays = item.mode === 'rent' ? (rentDaysMap[item.book.id] ?? item.rentDays ?? 30) : 30;
                                const factor = item.mode === 'rent' ? rentFactor(effectiveDays) : 1;
                                const price = item.book.price * factor;
                                return (
                                    <div key={`${item.book.id}-${item.mode}`} className="card p-3">
                                        <div className="flex gap-3">
                                            <div className="w-12 h-16 rounded bg-brand-soft flex-shrink-0 overflow-hidden">
                                                {item.book.image_url ? <img src={item.book.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📖</div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{item.book.title}</p>
                                                <p className="text-muted text-xs">
                                                    {item.mode === 'rent'
                                                        ? `Rent · ${Math.round(rentFactor(effectiveDays) * 100)}% of price`
                                                        : item.mode === 'gift'
                                                            ? 'Gift'
                                                            : 'Purchase'} × {item.qty}
                                                </p>
                                            </div>
                                            <span className="price-text text-sm font-semibold self-center">{money(price * item.qty)}</span>
                                        </div>
                                        {item.mode === 'rent' && (
                                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                                <p className="text-xs font-medium mb-2" style={{ color: '#5c4a30' }}>Rental Duration</p>
                                                <div className="flex gap-2">
                                                    {[30, 60].map(d => (
                                                        <button
                                                            key={d}
                                                            type="button"
                                                            onClick={() => setRentDaysMap(m => ({ ...m, [item.book.id]: d }))}
                                                            className="px-3 py-1 rounded-lg text-xs font-medium transition"
                                                            style={effectiveDays === d
                                                                ? { background: 'rgba(160,120,48,0.18)', color: '#a07830', border: '1px solid rgba(160,120,48,0.40)' }
                                                                : { background: '#faf8f4', color: '#7a6550', border: '1px solid rgba(160,120,48,0.22)' }
                                                            }
                                                        >
                                                            {d} days
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {item.mode === 'gift' && (
                                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                                <p className="text-xs font-medium mb-1.5" style={{ color: '#5c4a30' }}>Recipient Email</p>
                                                <input
                                                    type="email"
                                                    value={giftEmailMap[item.book.id] ?? ''}
                                                    onChange={e => setGiftEmailMap(m => ({ ...m, [item.book.id]: e.target.value }))}
                                                    placeholder="recipient@email.com"
                                                    className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Shipping speed selector (buy mode only) */}
                            {orderMode === 'buy' && (
                                <div className="card p-4">
                                    <h3 className="text-sm font-semibold text-white mb-3">Delivery Speed</h3>
                                    <div className="space-y-2">
                                        {SHIPPING_OPTIONS.map(opt => (
                                            <div
                                                key={opt.value}
                                                onClick={() => setShippingSpeed(opt.value)}
                                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${shippingSpeed === opt.value ? 'border-brand-gold/60 bg-brand-gold/5' : 'border-white/10 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${shippingSpeed === opt.value ? 'border-brand-gold' : 'border-white/20'}`}>
                                                        {shippingSpeed === opt.value && <div className="w-2 h-2 rounded-full bg-brand-gold" />}
                                                    </div>
                                                    <span className="text-sm text-white">{opt.label}</span>
                                                </div>
                                                <span className="text-sm text-brand-gold">+{money(opt.fee)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={() => setStep(1)} className="btn-primary w-full mt-2">Select Delivery Address →</button>
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4">Delivery Address</h2>
                            <div className="space-y-3">
                                {addresses.map(a => (
                                    <div
                                        key={a.id}
                                        onClick={() => setSelectedAddr(a.id)}
                                        className={`card cursor-pointer p-4 flex gap-3 transition ${selectedAddr === a.id ? 'border-brand-gold/60 bg-brand-gold/5' : 'hover:border-white/20'}`}
                                    >
                                        <div className="mt-0.5">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedAddr === a.id ? 'border-brand-gold' : 'border-white/20'}`}>
                                                {selectedAddr === a.id && <div className="w-2 h-2 rounded-full bg-brand-gold" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="tag tag-gold text-xs">{a.label}</span>
                                                <span className="text-sm font-medium text-white">{a.recipient}</span>
                                            </div>
                                            <p className="text-sm text-muted">{a.street}, {a.city}, {a.state} {a.zip}</p>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); handleDeleteAddress(a.id); }} className="p-1 text-red-400/40 hover:text-red-400 transition self-start">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {showNewAddr ? (
                                <form onSubmit={handleAddAddress} className="card p-4 mt-3 space-y-3">
                                    <h3 className="text-sm font-semibold text-white">New Address</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['label', 'recipient', 'street', 'city', 'state', 'zip'].map(k => (
                                            <input key={k} value={newAddr[k]} onChange={e => setNewAddr(a => ({ ...a, [k]: e.target.value }))}
                                                className={`${k === 'street' ? 'col-span-2' : ''} bg-brand-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/60`}
                                                placeholder={k.charAt(0).toUpperCase() + k.slice(1)} required={['recipient', 'street', 'city'].includes(k)}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" disabled={addressLoading} className="btn-primary text-sm py-2 px-4">Save</button>
                                        <button type="button" onClick={() => setShowNewAddr(false)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <button onClick={() => setShowNewAddr(true)} className="flex items-center gap-2 text-sm text-brand-gold hover:underline mt-3">
                                    <Plus className="w-4 h-4" /> Add new address
                                </button>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setStep(0)} className="btn-ghost text-sm py-2.5 px-5">← Back</button>
                                <button onClick={() => setStep(2)} disabled={addresses.length === 0 && !showNewAddr} className="btn-primary flex-1 disabled:opacity-50">Select Payment →</button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4">Payment</h2>
                            <div className="space-y-3">
                                {[
                                    { value: 'razorpay', label: 'Razorpay (Card / UPI / Netbanking)', icon: CreditCard },
                                    ...(orderMode === 'buy' ? [{ value: 'cod', label: 'Cash on Delivery (+₹10)', icon: Truck }] : []),
                                ].map(({ value, label, icon: Icon }) => (
                                    <div
                                        key={value}
                                        onClick={() => setPayMode(value)}
                                        className={`card cursor-pointer p-4 flex items-center gap-3 transition ${payMode === value ? 'border-brand-gold/60 bg-brand-gold/5' : 'hover:border-white/20'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payMode === value ? 'border-brand-gold' : 'border-white/20'}`}>
                                            {payMode === value && <div className="w-2 h-2 rounded-full bg-brand-gold" />}
                                        </div>
                                        <Icon className="w-4 h-4 text-muted" />
                                        <span className="text-sm text-white">{label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setStep(1)} className="btn-ghost text-sm py-2.5 px-5">← Back</button>
                                <button onClick={handlePlaceOrder} disabled={loading} className="btn-primary flex-1">
                                    {loading ? 'Placing order…' : `Place Order · ${money(total)}`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Order summary */}
                <div className="panel rounded-xl p-5 h-fit">
                    <h3 className="text-sm font-semibold text-white mb-4">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                        {cart.map(c => {
                            const effectiveDays = c.mode === 'rent' ? (rentDaysMap[c.book.id] ?? c.rentDays ?? 30) : 30;
                            const factor = c.mode === 'rent' ? rentFactor(effectiveDays) : 1;
                            const price = c.book.price * factor;
                            return (
                                <div key={`${c.book.id}-${c.mode}`} className="flex justify-between gap-2">
                                    <span className="text-muted truncate">{c.book.title} ×{c.qty}</span>
                                    <span className="text-white flex-shrink-0">{money(price * c.qty)}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-px bg-white/10 my-3" />
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted">Subtotal</span>
                            <span className="text-white">{money(subtotal)}</span>
                        </div>
                        {orderMode === 'buy' && (
                            <div className="flex justify-between">
                                <span className="text-muted">Shipping ({shippingSpeed})</span>
                                <span className="text-white">+{money(shippingFee)}</span>
                            </div>
                        )}
                        {orderMode === 'buy' && payMode === 'cod' && (
                            <div className="flex justify-between">
                                <span className="text-muted">COD fee</span>
                                <span className="text-white">+{money(10)}</span>
                            </div>
                        )}
                    </div>
                    <div className="h-px bg-white/10 my-3" />
                    <div className="flex justify-between font-semibold">
                        <span className="text-white">Total</span>
                        <span className="price-text text-lg">{money(total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
