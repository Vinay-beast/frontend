// Money formatter
export function money(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// YYYY-MM-DD for today (local timezone)
export function todayLocalDate() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Add N days to ISO date string
export function addDaysISO(isoDate, days) {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

// De-duplicate order array by id, keeping latest status
export function dedupeOrders(orders = []) {
    const map = new Map();
    for (const o of orders) {
        const key = o.id ?? o.order_id;
        if (!map.has(key)) { map.set(key, o); continue; }
        const prev = map.get(key);
        const prevDate = new Date(prev.created_at || 0);
        const currDate = new Date(o.created_at || 0);
        if (currDate > prevDate) map.set(key, o);
    }
    return [...map.values()].sort((a, b) => {
        const da = new Date(a.created_at || 0), db = new Date(b.created_at || 0);
        return db - da;
    });
}

// Format date nicely
export function formatDate(iso) {
    if (!iso) return '–';
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
}

// Shipping ETA — prefer backend-stored delivery_eta, fall back to status estimate
export function calcETA(order) {
    // Use stored delivery_eta from the database if available (priority=1d, express=3d, standard=5d)
    if (order.delivery_eta) return order.delivery_eta;
    const placed = order.created_at || new Date().toISOString();
    const status = (order.status || '').toLowerCase();
    const map = { pending: 5, confirmed: 4, processing: 3, shipped: 2, out_for_delivery: 1 };
    const days = map[status] ?? 0;
    if (days === 0) return null;
    return addDaysISO(placed, days);
}

// Pluralise helper
export function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

// Clamp a number between min and max
export function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

// Debounce
export function debounce(fn, ms = 300) {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Validate email
export function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

// Truncate text
export function truncate(s, max = 80) { return s?.length > max ? s.slice(0, max) + '…' : (s || ''); }
