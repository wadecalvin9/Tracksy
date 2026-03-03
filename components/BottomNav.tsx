'use client';

import type { Page } from '@/app/page';

const TABS = [
    { id: 'dashboard', icon: '⊞', label: 'Home' },
    { id: 'transactions', icon: '↕', label: 'Txns' },
    // FAB is center
    { id: 'budgets', icon: '◎', label: 'Budget' },
    { id: 'reports', icon: '📊', label: 'Reports' },
] as const;

interface Props {
    activePage: Page;
    onNavigate: (p: Page) => void;
    onAdd: () => void;
}

export default function BottomNav({ activePage, onNavigate, onAdd }: Props) {
    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner">
                {/* First 2 tabs */}
                {TABS.slice(0, 2).map(tab => (
                    <button
                        key={tab.id}
                        className={`bottom-nav-item${activePage === tab.id ? ' active' : ''}`}
                        onClick={() => onNavigate(tab.id as Page)}
                    >
                        <span className="bnav-icon">{tab.icon}</span>
                        <span className="bnav-label">{tab.label}</span>
                    </button>
                ))}

                {/* Centre FAB */}
                <div className="bnav-fab-wrap">
                    <button className="bnav-fab" onClick={onAdd} aria-label="Add transaction">
                        +
                    </button>
                </div>

                {/* Last 2 tabs */}
                {TABS.slice(2).map(tab => (
                    <button
                        key={tab.id}
                        className={`bottom-nav-item${activePage === tab.id ? ' active' : ''}`}
                        onClick={() => onNavigate(tab.id as Page)}
                    >
                        <span className="bnav-icon">{tab.icon}</span>
                        <span className="bnav-label">{tab.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}
