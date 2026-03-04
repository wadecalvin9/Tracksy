'use client';

import { useState, useEffect } from 'react';
import { Cog, Globe, Shield, Bell, User, HardDrive, RefreshCw, AlertTriangle, Cloud, CloudOff, LogIn, LogOut } from 'lucide-react';
import { getCurrency, setCurrency, getUserName, setUserName, getStorageInfo, requestPersistence, CURRENCIES } from '@/lib/db';
import type { User as FirebaseUser } from 'firebase/auth';
import type { SyncState } from '@/app/page';

interface Props {
    showToast: (msg: string, type?: 'success' | 'error') => void;
    user?: FirebaseUser | null;
    syncState?: SyncState;
    lastSync?: Date | null;
    onSignInClick?: () => void;
    onSignOut?: () => void;
    onSyncNow?: () => void;
}

export default function Settings({ showToast, user, syncState, lastSync, onSignInClick, onSignOut, onSyncNow }: Props) {
    const [currency, setCurr] = useState('USD');
    const [userName, setUName] = useState('User');
    const [storage, setStorage] = useState<{ usage: number, quota: number, persisted: boolean } | null>(null);

    useEffect(() => {
        getCurrency().then(setCurr);
        getUserName().then(setUName);
        getStorageInfo().then(setStorage);
    }, []);

    const handleNameChange = async (name: string) => {
        await setUserName(name);
        setUName(name);
        showToast('Name updated');
    };

    const handleReqPersist = async () => {
        await requestPersistence();
        const info = await getStorageInfo();
        setStorage(info);
        if (info?.persisted) {
            showToast('Storage is now persistent');
        } else {
            showToast('Persistence could not be enabled (browser restricted)', 'error');
        }
    };

    const handleCurrencyChange = async (code: string) => {
        await setCurrency(code);
        setCurr(code);
        showToast(`Currency changed to ${code}`);
        window.location.reload();
    };

    return (
        <div className="settings-page">
            <div className="topbar">
                <div>
                    <div className="topbar-title">Settings</div>
                    <div className="topbar-subtitle">Preferences & Configuration</div>
                </div>
            </div>

            <div className="page-content">
                <div className="settings-grid">
                    <section className="settings-section">
                        <div className="section-header">
                            <User size={20} className="section-icon" />
                            <div>
                                <h3 className="section-title">Profile</h3>
                                <p className="section-desc">Personalize your experience</p>
                            </div>
                        </div>

                        <div className="setting-control">
                            <label className="form-label">Display Name</label>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={userName}
                                    onChange={(e) => setUName(e.target.value)}
                                    placeholder="Enter your name"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px'
                                    }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleNameChange(userName)}
                                    style={{ padding: '0 20px', fontSize: '14px' }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="settings-section">
                        <div className="section-header">
                            <HardDrive size={20} className="section-icon" />
                            <div>
                                <h3 className="section-title">Data Management</h3>
                                <p className="section-desc">Manage local storage and persistence</p>
                            </div>
                        </div>

                        <div className="storage-info">
                            <div className="storage-stat">
                                <span className="stat-label">Storage Mode:</span>
                                <span className={`stat-value ${storage?.persisted ? 'persisted' : 'best-effort'}`}>
                                    {storage?.persisted ? 'Persistent' : 'Best Effort ⚠️'}
                                </span>
                            </div>
                            <div className="storage-stat">
                                <span className="stat-label">Usage:</span>
                                <span className="stat-value">{((storage?.usage || 0) / (1024 * 1024)).toFixed(2)} MB used</span>
                            </div>

                            {!storage?.persisted && (
                                <div className="storage-warning">
                                    <AlertTriangle size={14} />
                                    <span>Data may be purged by browser if disk is full. Enable persistence to protect it.</span>
                                </div>
                            )}

                            <button
                                className={`btn ${storage?.persisted ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={handleReqPersist}
                                disabled={storage?.persisted}
                                style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
                            >
                                {storage?.persisted ? 'Data is Protected' : 'Request Persistence'}
                            </button>
                        </div>
                    </section>

                    {/* Cloud Sync Section */}
                    <section className="settings-section">
                        <div className="section-header">
                            <Cloud size={20} className="section-icon" />
                            <div>
                                <h3 className="section-title">Cloud Sync</h3>
                                <p className="section-desc">Back up and sync across devices via Firebase</p>
                            </div>
                        </div>

                        {!user ? (
                            <div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                                    Sign in with Google to automatically back up your data and access it from any device.
                                </p>
                                <button className="google-signin-btn" onClick={onSignInClick} style={{ width: '100%', justifyContent: 'center' }}>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                                    </svg>
                                    <span>Sign in with Google</span>
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                    {user.photoURL && <img src={user.photoURL} alt="" width={40} height={40} style={{ borderRadius: '50%' }} />}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{user.displayName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                    </div>
                                </div>
                                <div className="storage-stat" style={{ marginBottom: 8 }}>
                                    <span className="stat-label">Status:</span>
                                    <span className={`stat-value ${syncState === 'synced' ? 'persisted' : syncState === 'error' ? 'best-effort' : ''}`}>
                                        {syncState === 'syncing' ? '⏳ Syncing…' : syncState === 'synced' ? '✅ Synced' : syncState === 'error' ? '❌ Sync error' : '☁️ Connected'}
                                    </span>
                                </div>
                                {lastSync && (
                                    <div className="storage-stat" style={{ marginBottom: 16 }}>
                                        <span className="stat-label">Last synced:</span>
                                        <span className="stat-value" style={{ fontSize: 12 }}>{lastSync.toLocaleString()}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                    <button className="btn btn-primary" onClick={onSyncNow} disabled={syncState === 'syncing'} style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
                                        <RefreshCw size={14} />
                                        {syncState === 'syncing' ? 'Syncing…' : 'Sync Now'}
                                    </button>
                                    <button className="btn btn-secondary" onClick={onSignOut} style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
                                        <LogOut size={14} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="settings-section">
                        <div className="section-header">
                            <Globe size={20} className="section-icon" />
                            <div>
                                <h3 className="section-title">Localization</h3>
                                <p className="section-desc">Regional settings and display formats</p>
                            </div>
                        </div>

                        <div className="setting-control">
                            <label className="form-label">Global Currency</label>
                            <div className="currency-selector">
                                {CURRENCIES.map(c => (
                                    <button
                                        key={c.code}
                                        className={`currency-chip ${currency === c.code ? 'active' : ''}`}
                                        onClick={() => handleCurrencyChange(c.code)}
                                    >
                                        <span className="curr-symbol">{c.symbol}</span>
                                        <span className="curr-code">{c.code}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="settings-section disabled">
                        <div className="section-header">
                            <Shield size={20} className="section-icon" />
                            <div>
                                <h3 className="section-title">Security</h3>
                                <p className="section-desc">Manage your data and privacy</p>
                            </div>
                        </div>
                        <div className="setting-placeholder">Coming soon</div>
                    </section>
                </div>
            </div>

            <style jsx>{`
                .settings-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    max-width: 800px;
                }
                .settings-section {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 24px;
                }
                .settings-section.disabled {
                    opacity: 0.5;
                }
                .section-header {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .section-icon {
                    color: var(--accent);
                }
                .section-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0;
                }
                .section-desc {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin: 2px 0 0;
                }
                .storage-info {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .storage-stat {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                }
                .stat-label {
                    color: var(--text-secondary);
                }
                .stat-value {
                    font-weight: 600;
                }
                .stat-value.persisted {
                    color: var(--green);
                }
                .stat-value.best-effort {
                    color: var(--amber);
                }
                .storage-warning {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                    padding: 10px 14px;
                    border-radius: 8px;
                    color: var(--amber);
                    font-size: 12px;
                }
                .currency-selector {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                    gap: 12px;
                    margin-top: 12px;
                }
                .currency-chip {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 16px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: var(--text-secondary);
                }
                .currency-chip.active {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: var(--accent);
                    color: var(--accent);
                }
                .curr-symbol {
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .curr-code {
                    font-size: 11px;
                    font-weight: 600;
                }
                .setting-placeholder {
                    padding: 12px;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 13px;
                    border: 1px dashed var(--border);
                    border-radius: 8px;
                }
            `}</style>
        </div>
    );
}
