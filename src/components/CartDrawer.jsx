import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { money } from '../lib/utils';

export default function CartDrawer() {
    const { cart, cartOpen, setCartOpen, updateQty, removeFromCart, clearCart } = useStore();
    const navigate = useNavigate();

    const total = cart.reduce((s, c) => {
        const rentFactor = c.mode === 'rent' ? (c.rentDays === 60 ? 0.50 : 0.35) : 1;
        const price = c.book.price * rentFactor;
        return s + price * c.qty;
    }, 0);

    function handleCheckout() {
        setCartOpen(false);
        navigate('/checkout');
    }

    return (
        <>
            {/* Overlay */}
            {cartOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setCartOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-brand-panel z-50 flex flex-col transition-transform duration-300 shadow-2xl ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-brand-gold" />
                        <h2 className="font-semibold text-white text-lg">Cart ({cart.length})</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 transition px-2 py-1">Clear all</button>
                        )}
                        <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-16">
                            <ShoppingBag className="w-12 h-12 text-white/10 mb-3" />
                            <p className="text-muted">Your cart is empty</p>
                            <button onClick={() => { setCartOpen(false); navigate('/catalog'); }} className="btn-secondary mt-4 text-sm">Browse Catalog</button>
                        </div>
                    ) : cart.map((item, idx) => {
                        const rentFactor = item.mode === 'rent' ? (item.rentDays === 60 ? 0.50 : 0.35) : 1;
                        const unitPrice = item.book.price * rentFactor;
                        return (
                            <div key={`${item.book.id}-${item.mode}`} className="card flex gap-3 p-3">
                                {/* Cover */}
                                <div className="w-14 h-20 rounded bg-brand-soft flex-shrink-0 overflow-hidden">
                                    {item.book.image_url ? (
                                        <img src={item.book.image_url} alt={item.book.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brand-gold/30 text-xl">📖</div>
                                    )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium leading-snug truncate">{item.book.title}</p>
                                    <p className="text-muted text-xs mt-0.5">{item.book.author}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`tag text-xs ${item.mode === 'rent' ? 'tag-gold' : 'bg-brand-crimson/20 text-brand-crimson border-brand-crimson/30'}`}>
                                            {item.mode === 'rent' ? `Rent ${item.rentDays}d` : item.mode === 'gift' ? '🎁 Gift' : 'Buy'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => updateQty(item.book.id, item.mode, item.qty - 1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                                                <Minus className="w-3 h-3 text-white" />
                                            </button>
                                            <span className="text-white text-sm w-6 text-center">{item.qty}</span>
                                            <button onClick={() => updateQty(item.book.id, item.mode, item.qty + 1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                                                <Plus className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="price-text text-sm">{money(unitPrice * item.qty)}</span>
                                            <button onClick={() => removeFromCart(item.book.id, item.mode)} className="p-1 text-red-400/60 hover:text-red-400 transition">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="px-5 py-4 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-muted text-sm">Total</span>
                            <span className="price-text text-xl font-bold">{money(total)}</span>
                        </div>
                        <button onClick={handleCheckout} className="btn-primary w-full">
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
