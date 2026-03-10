import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, MapPin, Camera, Plus, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { getProfile, updateProfile, changePassword, uploadProfilePic, listAddresses, addAddress, deleteAddress } from '../lib/api';
import { isValidEmail } from '../lib/utils';

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
];

export default function ProfilePage() {
    const { token, user, setUser } = useStore();
    const [tab, setTab] = useState('profile');
    const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', bio: user?.bio || '' });
    const [picLoading, setPicLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
    const [showPw, setShowPw] = useState({ c: false, n: false, cf: false });
    const [addresses, setAddresses] = useState([]);
    const [newAddr, setNewAddr] = useState({ label: 'Home', recipient: '', street: '', city: '', state: '', zip: '' });
    const [showNewAddr, setShowNewAddr] = useState(false);
    const [addrLoading, setAddrLoading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        if (!token) return;
        getProfile(token).then(u => {
            setUser(u);
            setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '', bio: u.bio || '' });
        }).catch(() => { });
        listAddresses(token).then(setAddresses).catch(() => { });
    }, [token]);

    async function handleSaveProfile(e) {
        e.preventDefault();
        if (!profile.name.trim()) { toast.error('Name required'); return; }
        setSaveLoading(true);
        try {
            const updated = await updateProfile(token, { name: profile.name.trim(), phone: profile.phone.trim(), bio: profile.bio.trim() });
            setUser(updated);
            try { localStorage.setItem('user_cache', JSON.stringify(updated)); } catch { }
            toast.success('Profile updated!');
        } catch (e) { toast.error(e.message || 'Failed'); }
        finally { setSaveLoading(false); }
    }

    async function handlePicChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
        setPicLoading(true);
        try {
            const res = await uploadProfilePic(token, file, { name: profile.name, phone: profile.phone });
            const updated = res?.user || res;
            setUser(updated);
            try { localStorage.setItem('user_cache', JSON.stringify(updated)); } catch { }
            toast.success('Photo updated!');
        } catch (e) { toast.error(e.message || 'Upload failed'); }
        finally { setPicLoading(false); }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        if (!pwForm.current && user?.has_password) { toast.error('Current password required'); return; }
        if (pwForm.new.length < 6) { toast.error('New password must be at least 6 characters'); return; }
        if (pwForm.new !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
        setSaveLoading(true);
        try {
            await changePassword(token, { oldPassword: pwForm.current, newPassword: pwForm.new });
            setPwForm({ current: '', new: '', confirm: '' });
            toast.success('Password changed!');
        } catch (e) { toast.error(e.message || 'Failed'); }
        finally { setSaveLoading(false); }
    }

    async function handleAddAddress(e) {
        e.preventDefault();
        if (!newAddr.recipient || !newAddr.street || !newAddr.city) { toast.error('Fill required fields'); return; }
        setAddrLoading(true);
        try {
            await addAddress(token, newAddr);
            const list = await listAddresses(token);
            setAddresses(list);
            setShowNewAddr(false);
            setNewAddr({ label: 'Home', recipient: '', street: '', city: '', state: '', zip: '' });
            toast.success('Address added');
        } catch (e) { toast.error(e.message || 'Failed'); }
        finally { setAddrLoading(false); }
    }

    async function handleDeleteAddress(id) {
        try {
            await deleteAddress(token, id);
            setAddresses(a => a.filter(x => x.id !== id));
            toast.success('Removed');
        } catch { toast.error('Failed'); }
    }

    const displayPic = user?.profile_pic;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="font-display text-3xl font-bold text-white mb-6">My Profile</h1>

            {/* Profile pic */}
            <div className="panel rounded-2xl p-6 flex items-center gap-5 mb-6">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-soft ring-2 ring-brand-gold/30">
                        {displayPic ? (
                            <img src={displayPic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl text-brand-gold/40">
                                {(user?.name || 'U')[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={picLoading}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-gold/90 hover:bg-brand-gold text-brand-dark flex items-center justify-center shadow transition"
                    >
                        {picLoading ? <div className="w-3 h-3 border border-brand-dark border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
                </div>
                <div>
                    <p className="text-white font-semibold text-lg">{user?.name || '—'}</p>
                    <p className="text-muted text-sm">{user?.email}</p>
                    {user?.is_admin && <span className="tag tag-gold text-xs mt-1 inline-block">Admin</span>}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-brand-panel rounded-xl p-1 w-fit">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === id ? 'bg-brand-gold text-white' : 'hover:bg-[rgba(160,120,48,0.10)]'}`}
                        style={tab !== id ? { color: '#5c4a30' } : {}}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Profile tab */}
            {tab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="panel rounded-2xl p-6 space-y-4">
                    {[
                        { key: 'name', label: 'Full Name', type: 'text', required: true },
                        { key: 'email', label: 'Email', type: 'email', disabled: true },
                        { key: 'phone', label: 'Phone', type: 'tel' },
                        { key: 'bio', label: 'Bio', type: 'textarea' },
                    ].map(({ key, label, type, required, disabled }) => (
                        <div key={key}>
                            <label className="block text-sm text-muted mb-1.5">{label}</label>
                            {type === 'textarea' ? (
                                <textarea
                                    value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-brand-dark border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/60 resize-none"
                                />
                            ) : (
                                <input
                                    type={type} value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                                    disabled={disabled} required={required}
                                    className="w-full bg-brand-dark border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/60 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            )}
                        </div>
                    ))}
                    <button type="submit" disabled={saveLoading} className="btn-primary">
                        <Save className="w-4 h-4 mr-2 inline" />
                        {saveLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            )}

            {/* Password tab */}
            {tab === 'password' && (
                <form onSubmit={handleChangePassword} className="panel rounded-2xl p-6 space-y-4">
                    {!user?.has_password && (
                        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-400 text-sm">
                            You signed in with Google. Set a password to enable email login.
                        </div>
                    )}
                    {[
                        { key: 'current', label: 'Current Password', show: 'c', hidden: !user?.has_password },
                        { key: 'new', label: 'New Password', show: 'n' },
                        { key: 'confirm', label: 'Confirm New Password', show: 'cf' },
                    ].filter(f => !f.hidden).map(({ key, label, show }) => (
                        <div key={key}>
                            <label className="block text-sm text-muted mb-1.5">{label}</label>
                            <div className="relative">
                                <input
                                    type={showPw[show] ? 'text' : 'password'} value={pwForm[key]}
                                    onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                                    className="w-full bg-brand-dark border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/60"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPw(s => ({ ...s, [show]: !s[show] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition">
                                    {showPw[show] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ))}
                    <button type="submit" disabled={saveLoading} className="btn-primary">
                        {saveLoading ? 'Saving…' : 'Update Password'}
                    </button>
                </form>
            )}

            {/* Addresses tab */}
            {tab === 'addresses' && (
                <div className="space-y-3">
                    {addresses.map(a => (
                        <div key={a.id} className="panel rounded-xl p-4 flex gap-3">
                            <MapPin className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="tag tag-gold text-xs">{a.label}</span>
                                    <span className="text-sm font-medium text-white">{a.recipient}</span>
                                </div>
                                <p className="text-sm text-muted">{a.street}, {a.city}, {a.state} {a.zip}</p>
                            </div>
                            <button onClick={() => handleDeleteAddress(a.id)} className="p-1.5 text-red-400/40 hover:text-red-400 transition flex-shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {showNewAddr ? (
                        <form onSubmit={handleAddAddress} className="panel rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-white">New Address</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[['label', 'Label / Tag (e.g. Home)'], ['recipient', 'Full name'], ['street', 'Street address'], ['city', 'City'], ['state', 'State'], ['zip', 'PIN / ZIP code']].map(([k, ph]) => (
                                    <input key={k} value={newAddr[k]} onChange={e => setNewAddr(a => ({ ...a, [k]: e.target.value }))}
                                        className={`${k === 'street' ? 'col-span-2' : ''} bg-brand-soft border border-black/[0.09] rounded-lg px-3 py-2 text-sm text-[#1a1208] addr-input focus:outline-none focus:border-brand-gold/60`}
                                        placeholder={ph} required={['recipient', 'street', 'city'].includes(k)}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={addrLoading} className="btn-primary text-sm py-2 px-4">Save</button>
                                <button type="button" onClick={() => setShowNewAddr(false)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <button onClick={() => setShowNewAddr(true)} className="flex items-center gap-2 text-sm text-brand-gold hover:underline">
                            <Plus className="w-4 h-4" /> Add New Address
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
