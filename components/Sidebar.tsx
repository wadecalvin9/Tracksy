'use client';

import type { Page } from '@/app/page';

const NAV = [
    { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
    { id: 'transactions', icon: '↕', label: 'Transactions' },
    { id: 'budgets', icon: '◎', label: 'Budgets' },
    { id: 'accounts', icon: '🏦', label: 'Accounts' },
    { id: 'reports', icon: '📊', label: 'Reports' },
] as const;

export default function Sidebar({
    activePage,
    onNavigate,
}: {
    activePage: Page;
    onNavigate: (p: Page) => void;
}) {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">💸</div>
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
                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Storage</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>IndexedDB via Dexie</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>100% local — no server</div>
                </div>
            </div>
        </aside>
    );
}
