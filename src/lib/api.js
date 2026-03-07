const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const TIMEOUT_MS = 30000;

// ---------- Token ----------
let __token = null;
try { __token = localStorage.getItem('token') || null; } catch { }

export function setAuthToken(t) {
    __token = t || null;
    try { t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); } catch { }
}
export function clearAuthToken() { setAuthToken(null); }
export function getToken() { return __token; }

function authHeader(t) {
    const k = t || __token;
    return k ? { Authorization: `Bearer ${k}` } : {};
}

// ---------- Core fetch ----------
async function fetchTimeout(url, opts = {}, ms = TIMEOUT_MS) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(id); }
}

async function request(endpoint, { method = 'GET', body = null, token = null, headers = {}, timeoutMs = TIMEOUT_MS, retry = 1 } = {}) {
    const url = `${API_BASE}${endpoint}`;
    const baseHeaders = { 'Content-Type': 'application/json', ...authHeader(token), ...headers };
    const opts = { method, headers: baseHeaders, body: body != null ? JSON.stringify(body) : undefined };

    let lastErr;
    for (let attempt = 0; attempt <= retry; attempt++) {
        try {
            const res = await fetchTimeout(url, opts, timeoutMs);
            const text = await res.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
            if (!res.ok) {
                const e = new Error((data?.message) || `${res.status} ${res.statusText}`);
                e.status = res.status; e.data = data;
                throw e;
            }
            return data;
        } catch (err) {
            lastErr = err;
            const is4xx = err?.status >= 400 && err?.status < 500;
            if (is4xx || attempt === retry) break;
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        }
    }
    throw lastErr;
}

async function upload(endpoint, formData, { token = null, method = 'POST', timeoutMs = TIMEOUT_MS } = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...authHeader(token) };
    const res = await fetchTimeout(url, { method, headers, body: formData }, timeoutMs);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
    if (!res.ok) {
        const e = new Error(data?.message || `${res.status} ${res.statusText}`);
        e.status = res.status; throw e;
    }
    return data;
}

const GET = (e, o = {}) => request(e, { ...o, method: 'GET' });
const POST = (e, b, o = {}) => request(e, { ...o, method: 'POST', body: b });
const PUT = (e, b, o = {}) => request(e, { ...o, method: 'PUT', body: b });
const DEL = (e, o = {}) => request(e, { ...o, method: 'DELETE' });

// ---------- Mappers ----------
export function mapBook(raw) {
    if (!raw) return null;
    return { id: raw.id, title: raw.title, author: raw.author, price: Number(raw.price || 0), stock: raw.stock, description: raw.description || '', image_url: raw.image_url || raw.cover || '', google_books_id: raw.google_books_id || null };
}
function mapUser(raw) {
    if (!raw) return null;
    return { id: raw.id, name: raw.name, email: raw.email, phone: raw.phone || '', bio: raw.bio || '', profile_pic: raw.profile_pic || '', has_password: raw.has_password, addresses: Array.isArray(raw.addresses) ? raw.addresses : [], cards: Array.isArray(raw.cards) ? raw.cards : [], is_admin: !!raw.is_admin };
}

// ---------- Auth ----------
export async function login(credentials) {
    const data = await POST('/auth/login', credentials);
    if (data?.token) setAuthToken(data.token);
    return { token: data.token, user: mapUser(data.user) };
}
export async function register(user) {
    const data = await POST('/auth/register', user);
    if (data?.token) setAuthToken(data.token);
    return { token: data.token, user: mapUser(data.user) };
}
export async function loginWithGoogle(token) {
    const data = await POST('/auth/google-login', { token });
    if (data?.token) setAuthToken(data.token);
    return { token: data.token, user: mapUser(data.user) };
}

// ---------- Profile ----------
export async function getProfile(token) { return mapUser(await GET('/users/profile', { token })); }
export async function updateProfile(token, body) {
    const data = await PUT('/users/profile', body, { token });
    return mapUser(data?.user || data);
}
export async function changePassword(token, body) { return PUT('/users/password', body, { token }); }
export async function uploadProfilePic(token, file, userData = {}) {
    const fd = new FormData();
    fd.append('profile_pic', file);
    if (userData.name) fd.append('name', userData.name);
    if (userData.phone !== undefined) fd.append('phone', userData.phone);
    const data = await upload('/users/profile', fd, { token, method: 'PUT' });
    if (data?.user) return mapUser(data.user);
    return data;
}

// ---------- Addresses ----------
export async function listAddresses(token) {
    const res = await GET('/users/addresses', { token });
    const arr = Array.isArray(res) ? res : (res?.addresses || []);
    return arr.map(a => ({ id: a.id ?? a.address_id ?? null, label: a.label ?? 'Address', recipient: a.recipient ?? a.name ?? '', street: a.street ?? a.line1 ?? '', city: a.city ?? '', state: a.state ?? '', zip: a.zip ?? a.postal_code ?? '' })).filter(a => a.id);
}
export async function addAddress(token, addr) { return POST('/users/addresses', addr, { token }); }
export async function deleteAddress(token, id) { return DEL(`/users/addresses/${id}`, { token }); }

// ---------- Books ----------
export async function getBooks(page = 1, limit = 20) {
    const res = await GET(`/books?page=${page}&limit=${limit}`);
    const books = (res?.books || res || []).map(mapBook);
    return { books, total: res?.total ?? books.length };
}
export async function searchBooks(query, page = 1, limit = 20) {
    const res = await GET(`/books/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    const books = (res?.books || res || []).map(mapBook);
    return { books, total: res?.total ?? books.length };
}
export async function getBookById(id) { return mapBook(await GET(`/books/${id}`)); }

// ---------- Orders ----------
export async function placeOrder(token, data) { return POST('/orders', data, { token }); }
export async function getOrders(token) {
    const res = await GET('/orders', { token });
    return Array.isArray(res) ? res : (res?.orders || []);
}
export async function getOrderById(token, id) { return GET(`/orders/${id}`, { token }); }

// ---------- Admin ----------
export async function getAdminOrders(token) { return GET('/admin/orders', { token }); }
export async function getAdminUsers(token) { return GET('/admin/users', { token }); }
export async function createBookAdmin(token, payload) { return POST('/admin/books', payload, { token }); }
export async function updateBookAdmin(token, id, payload) { return PUT(`/admin/books/${id}`, payload, { token }); }
export async function deleteBookAdmin(token, id) { return DEL(`/admin/books/${id}`, { token }); }

// ---------- Library ----------
export async function getLibrary(token) {
    const res = await GET('/library', { token });
    // Backend returns { owned: [{book:{...}, purchased_at}], rented: [{book:{...}, rental_end}] }
    // Normalize so each item has flat fields: title, author, image_url, book_id, expires_at
    const normalize = (arr) => (arr || []).map(x => {
        const b = x.book || x;
        return { ...b, book_id: b.id ?? x.book_id, expires_at: x.rental_end ?? x.expires_at ?? null };
    });
    return { owned: normalize(res?.owned), rented: normalize(res?.rented) };
}

// ---------- Gifts ----------
export async function getMyGifts(token) { const res = await GET('/gifts/mine', { token }); return Array.isArray(res) ? res : []; }
export async function claimSpecificGift(token, giftId) { return POST(`/gifts/claim/${giftId}`, {}, { token }); }
export async function markGiftAsRead(token, giftId) { return POST(`/gifts/read/${giftId}`, {}, { token }); }
export async function markAllGiftsRead(token) { return POST('/gifts/read-all', {}, { token }); }

// ---------- Book Content ----------
export async function getBookReadingAccess(token, bookId) { return request(`/book-content/${bookId}/read`, { token }); }
export async function uploadBookContent(token, bookId, file, pageCount) {
    const fd = new FormData(); fd.append('content', file); if (pageCount) fd.append('page_count', pageCount);
    return upload(`/book-content/${bookId}/content`, fd, { token });
}
export async function uploadBookSample(token, bookId, file) {
    const fd = new FormData(); fd.append('sample', file);
    return upload(`/book-content/${bookId}/sample`, fd, { token });
}
export async function uploadBookCover(token, bookId, file) {
    const fd = new FormData(); fd.append('cover', file);
    return upload(`/book-content/${bookId}/cover`, fd, { token });
}

// ---------- Wishlist ----------
export async function getWishlist(token) { const res = await GET('/wishlist', { token }); return Array.isArray(res) ? res : []; }
export async function addToWishlist(token, bookId) { return POST(`/wishlist/${bookId}`, {}, { token }); }
export async function removeFromWishlist(token, bookId) { return DEL(`/wishlist/${bookId}`, { token }); }
export async function getWishlistCount(token) { return GET('/wishlist/count', { token }); }

// ---------- Reviews ----------
export async function getBookReviews(bookId) {
    const res = await GET(`/reviews/book/${bookId}`);
    // Backend returns { reviews: [...], avgRating, totalReviews } — extract the array
    return Array.isArray(res) ? res : (res?.reviews || []);
}
export async function getBulkRatings(bookIds) { return POST('/reviews/ratings/bulk', { bookIds }); }
export async function getMyReview(token, bookId) { return GET(`/reviews/my/${bookId}`, { token }); }
export async function canReviewBook(token, bookId) { return GET(`/reviews/can-review/${bookId}`, { token }); }
export async function submitReview(token, bookId, rating, reviewText) { return POST(`/reviews/${bookId}`, { rating, reviewText }, { token }); }
export async function deleteReview(token, bookId) { return DEL(`/reviews/${bookId}`, { token }); }

// ---------- Google Books ----------
export async function searchGoogleBooks(token, query, maxResults = 20) { return GET(`/google-books/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`, { token }); }
export async function importGoogleBook(token, bookData) { return POST('/google-books/import', bookData, { token }); }
export async function bulkImportGoogleBooks(token, books) { return POST('/google-books/bulk-import', { books }, { token }); }

// ---------- AI ----------
export async function chatRecommendation(token, message) { return POST('/recommendations/chat', { message }, { token }); }
export async function processShoppingQuery(token, query) { return POST('/shopping-agent/process', { query }, { token }); }
export async function processResolutionQuery(token, query) { return POST('/resolution-agent/process', { query }, { token }); }
export async function getPaymentIssues(token) { return GET('/resolution-agent/payment-issues', { token }); }
export async function resolvePayment(token, orderId) { return POST(`/resolution-agent/resolve-payment/${orderId}`, {}, { token }); }
export async function simulatePaymentFailure(token) { return POST('/resolution-agent/demo/simulate-failure', {}, { token }); }
export async function getLastOrder(token) { return GET('/resolution-agent/last-order', { token }); }

// ---------- Book Search (image) ----------
export async function searchBookByImage(token, imageFile) {
    const fd = new FormData(); fd.append('image', imageFile);
    return upload('/book-search/image', fd, { token, timeoutMs: 60000 });
}

// ---------- Reading Progress ----------
export async function getReadingProgress(token) { return GET('/reading-progress', { token }); }
export async function getBookProgress(token, bookId) { return GET(`/reading-progress/${bookId}`, { token }); }
export async function saveReadingProgress(token, bookId, currentPage, totalPages) { return POST('/reading-progress', { book_id: bookId, current_page: currentPage, total_pages: totalPages }, { token }); }
export async function resetReadingProgress(token, bookId) { return DEL(`/reading-progress/${bookId}`, { token }); }

// ---------- Summaries ----------
export async function generateBookSummary(token, bookId, startPage = null, endPage = null) { return POST('/summaries/generate', { bookId, startPage, endPage }, { token }); }

// ---------- Payments ----------
export async function createRazorpayOrder(token, amount, orderId) {
    return POST('/payments/create-order', { amount, orderId, currency: 'INR' }, { token });
}
export async function verifyPayment(token, razorpayResponse, booknookOrderId) {
    return POST('/payments/verify', { ...razorpayResponse, booknook_order_id: booknookOrderId }, { token });
}

export const API_BASE_URL = API_BASE;
