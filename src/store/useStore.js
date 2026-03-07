import { create } from 'zustand';
import { setAuthToken, clearAuthToken } from '../lib/api';

const useStore = create((set, get) => ({
    // ---------- Auth ----------
    token: null,
    user: null,
    authLoading: false,
    authError: null,

    setAuth(token, user) {
        setAuthToken(token);
        set({ token, user });
    },
    setUser(user) { set({ user }); },
    setAuthLoading(v) { set({ authLoading: v }); },
    setAuthError(msg) { set({ authError: msg }); },
    logout() {
        clearAuthToken();
        set({ token: null, user: null, cart: [], wishlistIds: new Set(), giftCount: 0 });
    },

    // ---------- Cart ----------
    cart: [],          // [{ book, qty, mode:'buy'|'rent', rentDays, giftEmail }]
    cartOpen: false,

    setCartOpen(v) { set({ cartOpen: v }); },
    toggleCart() { set(s => ({ cartOpen: !s.cartOpen })); },

    addToCart(book, mode = 'buy', { rentDays = 30, giftEmail = '' } = {}) {
        set(s => {
            const existing = s.cart.findIndex(c => c.book.id === book.id && c.mode === mode);
            if (existing >= 0) {
                const cart = [...s.cart];
                cart[existing] = { ...cart[existing], qty: cart[existing].qty + 1 };
                return { cart };
            }
            return { cart: [...s.cart, { book, qty: 1, mode, rentDays, giftEmail }] };
        });
    },
    removeFromCart(bookId, mode) {
        set(s => ({ cart: s.cart.filter(c => !(c.book.id === bookId && c.mode === mode)) }));
    },
    updateQty(bookId, mode, qty) {
        if (qty <= 0) { get().removeFromCart(bookId, mode); return; }
        set(s => ({
            cart: s.cart.map(c => c.book.id === bookId && c.mode === mode ? { ...c, qty } : c)
        }));
    },
    clearCart() { set({ cart: [] }); },
    get cartTotal() {
        return get().cart.reduce((sum, c) => {
            const rentFactor = c.rentDays === 60 ? 0.50 : 0.35;
            const price = c.mode === 'rent' ? c.book.price * rentFactor : c.book.price;
            return sum + price * c.qty;
        }, 0);
    },

    // ---------- Wishlist ----------
    wishlistIds: new Set(),
    wishlistBooks: [],

    setWishlist(books) {
        set({ wishlistBooks: books, wishlistIds: new Set(books.map(b => String(b.book_id ?? b.id))) });
    },
    addWishlistId(id) {
        set(s => ({ wishlistIds: new Set([...s.wishlistIds, String(id)]) }));
    },
    removeWishlistId(id) {
        set(s => {
            const n = new Set(s.wishlistIds);
            n.delete(String(id));
            return {
                wishlistIds: n,
                wishlistBooks: s.wishlistBooks.filter(b => String(b.book_id ?? b.id) !== String(id))
            };
        });
    },

    // ---------- Book cache ----------
    bookCache: {},          // id → book object
    cacheBook(book) {
        if (!book?.id) return;
        set(s => ({ bookCache: { ...s.bookCache, [book.id]: book } }));
    },
    getCachedBook(id) { return get().bookCache[id] || null; },

    // ---------- Gift notification ----------
    giftCount: 0,
    setGiftCount(n) { set({ giftCount: n }); },

    // ---------- Theme ----------
    theme: 'dark',
    setTheme(t) { set({ theme: t }); },

    // ---------- Global modals / state ----------
    activeBookId: null,     // open in BookModal
    readerBookId: null,     // open in ReaderModal
    setActiveBook(id) { set({ activeBookId: id }); },
    closeActiveBook() { set({ activeBookId: null }); },
    openReader(id) { set({ readerBookId: id }); },
    closeReader() { set({ readerBookId: null }); },

    // ---------- Agent panels ----------
    shoppingAgentOpen: false,
    toggleShoppingAgent() { set(s => ({ shoppingAgentOpen: !s.shoppingAgentOpen, aiChatOpen: false })); },
    aiChatOpen: false,
    toggleAiChat() { set(s => ({ aiChatOpen: !s.aiChatOpen, shoppingAgentOpen: false })); },
}));

export default useStore;
