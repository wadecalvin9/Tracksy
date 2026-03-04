'use client';

import {
    LayoutDashboard,
    ArrowUpDown,
    Target,
    Landmark,
    BarChart3,
    Wallet,
    Cog,
} from 'lucide-react';
import type { Page } from '@/app/page';
import type { User } from 'firebase/auth';
import SyncStatus from './SyncStatus';

const NAV = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'transactions', icon: <ArrowUpDown size={18} />, label: 'Transactions' },
    { id: 'budgets', icon: <Target size={18} />, label: 'Budgets' },
    { id: 'accounts', icon: <Landmark size={18} />, label: 'Accounts' },
    { id: 'reports', icon: <BarChart3 size={18} />, label: 'Reports' },
    { id: 'settings', icon: <Cog size={18} />, label: 'Settings' },
] as const;

type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export default function Sidebar({
    activePage,
    onNavigate,
    user,
    syncState,
    lastSync,
    onSignInClick,
    onSignOut,
    onSyncNow,
}: {
    activePage: Page;
    onNavigate: (p: Page) => void;
    user: User | null;
    syncState: SyncState;
    lastSync: Date | null;
    onSignInClick: () => void;
    onSignOut: () => void;
    onSyncNow: () => void;
}) {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Wallet size={20} />
                </div>
                <span>Tracksy</span>
            </div>

            <span className="sidebar-section-label">Menu</span>

            {NAV.map(item => (
                <button
                    key={item.id}
                    className={`nav-item${activePage === item.id ? ' active' : ''}`}
                    onClick={() => onNavigate(item.id as Page)}
                    style={{ width: '100%', textAlign: 'left', background: activePage === item.id ? undefined : 'none', border: activePage === item.id ? undefined : 'none' }}
                >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                </button>
            ))}

            <div className="sidebar-footer">
                <SyncStatus
                    user={user}
                    syncState={syncState}
                    lastSync={lastSync}
                    onSignInClick={onSignInClick}
                    onSignOut={onSignOut}
                    onSyncNow={onSyncNow}
                />
            </div>
        </aside>
    );
}
