'use client';

import { Cloud, CloudOff, RefreshCw, Check, LogIn, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface Props {
    user: User | null;
    syncState: SyncState;
    lastSync: Date | null;
    onSignInClick: () => void;
    onSignOut: () => void;
    onSyncNow: () => void;
}

export default function SyncStatus({ user, syncState, lastSync, onSignInClick, onSignOut, onSyncNow }: Props) {
    const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (!user) {
        return (
            <div className="sync-panel" style={{ cursor: 'pointer' }} onClick={onSignInClick}>
                <div className="sync-icon offline">
                    <CloudOff size={14} />
                </div>
                <div className="sync-text">
                    <div className="sync-label">Local only</div>
                    <div className="sync-sublabel">Tap to enable sync</div>
                </div>
                <LogIn size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
            </div>
        );
    }

    const icon = syncState === 'syncing' ? (
        <RefreshCw size={14} className="spin" />
    ) : syncState === 'synced' ? (
        <Check size={14} />
    ) : syncState === 'error' ? (
        <CloudOff size={14} />
    ) : (
        <Cloud size={14} />
    );

    const stateColor = syncState === 'synced' ? 'var(--green)' : syncState === 'error' ? 'var(--red)' : 'var(--accent)';

    return (
        <div className="sync-panel">
            <div className="sync-avatar">
                {user.photoURL
                    ? <img src={user.photoURL} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />
                    : <span style={{ fontSize: 14 }}>{user.displayName?.[0] || '?'}</span>
                }
            </div>
            <div className="sync-text">
                <div className="sync-label" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email}
                </div>
                <div className="sync-sublabel" style={{ color: stateColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {icon}
                    {syncState === 'syncing' ? 'Syncing…' :
                        syncState === 'synced' ? (lastSync ? `Synced ${fmtTime(lastSync)}` : 'Synced') :
                            syncState === 'error' ? 'Sync error' : 'Cloud sync on'}
                </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" title="Sync now" onClick={onSyncNow} style={{ padding: '4px 6px' }}>
                    <RefreshCw size={13} />
                </button>
                <button className="btn btn-ghost btn-sm" title="Sign out" onClick={onSignOut} style={{ padding: '4px 6px' }}>
                    <LogOut size={13} />
                </button>
            </div>
        </div>
    );
}
