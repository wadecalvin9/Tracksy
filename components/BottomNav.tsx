'use client';

import {
    LayoutDashboard,
    ArrowUpDown,
    Target,
    Landmark,
    BarChart3,
    Cog
} from 'lucide-react';
import type { Page } from '@/app/page';

const TABS = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Home' },
    { id: 'transactions', icon: <ArrowUpDown size={18} />, label: 'Txns' },
    { id: 'budgets', icon: <Target size={18} />, label: 'Budget' },
    // FAB is center
    { id: 'reports', icon: <BarChart3 size={18} />, label: 'Reports' },
    { id: 'accounts', icon: <Landmark size={18} />, label: 'Accounts' },
    { id: 'settings', icon: <Cog size={18} />, label: 'Settings' },
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
                {/* First 3 tabs */}
                {TABS.slice(0, 3).map(tab => (
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
                {TABS.slice(3).map(tab => (
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
