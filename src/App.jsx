import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useStore from './store/useStore';
import { getToken, getWishlist } from './lib/api';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import SupportPage from './pages/SupportPage';

// Layout components (shown on authenticated pages)
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import BookModal from './components/BookModal';
import ReaderModal from './components/ReaderModal';
import AIChatWidget from './components/widgets/AIChatWidget';
import ShoppingAgentWidget from './components/widgets/ShoppingAgentWidget';
import BookSearchWidget from './components/widgets/BookSearchWidget';

// ---------- Guards ----------
function AuthGuard({ children }) {
    const token = useStore(s => s.token);
    const savedToken = getToken();
    if (!token && !savedToken) return <Navigate to="/" replace />;
    return children;
}

function AdminGuard({ children }) {
    const user = useStore(s => s.user);
    if (user && !user.is_admin) return <Navigate to="/home" replace />;
    return children;
}

function GuestGuard({ children }) {
    const token = useStore(s => s.token);
    const user = useStore(s => s.user);
    if (token) return <Navigate to={user?.is_admin ? '/admin' : '/home'} replace />;
    return children;
}

// ---------- App shell for authenticated pages ----------
function AppShell({ children }) {
    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-brand-dark pt-16">{children}</main>
            <CartDrawer />
            <BookModal />
            <ReaderModal />
            <AIChatWidget />
            <ShoppingAgentWidget />
            <BookSearchWidget />
        </>
    );
}

// ---------- Token bootstrap ----------
function TokenBootstrap() {
    const { token, setAuth, setWishlist } = useStore();
    useEffect(() => {
        if (!token) {
            const saved = getToken();
            if (saved) {
                const cachedUser = (() => { try { return JSON.parse(localStorage.getItem('user_cache') || 'null'); } catch { return null; } })();
                setAuth(saved, cachedUser);
                // Bootstrap wishlist so heart icons show correctly everywhere
                getWishlist(saved).then(data => setWishlist(data)).catch(() => { });
            }
        }
    }, []);
    return null;
}

export default function App() {

    return (
        <>
            <TokenBootstrap />
            <Routes>
                {/* Public */}
                <Route path="/" element={<GuestGuard><LoginPage /></GuestGuard>} />
                <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />

                {/* Protected */}
                <Route path="/home" element={<AuthGuard><AppShell><HomePage /></AppShell></AuthGuard>} />
                <Route path="/catalog" element={<AuthGuard><AppShell><CatalogPage /></AppShell></AuthGuard>} />
                <Route path="/checkout" element={<AuthGuard><AppShell><CheckoutPage /></AppShell></AuthGuard>} />
                <Route path="/orders" element={<AuthGuard><AppShell><OrdersPage /></AppShell></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><AppShell><ProfilePage /></AppShell></AuthGuard>} />
                <Route path="/support" element={<AuthGuard><AppShell><SupportPage /></AppShell></AuthGuard>} />

                {/* Admin */}
                <Route
                    path="/admin"
                    element={
                        <AuthGuard>
                            <AdminGuard>
                                <AdminPage />
                            </AdminGuard>
                        </AuthGuard>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
