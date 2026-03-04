'use client';

import { useState, useEffect } from 'react';
import { Cog, Globe, CreditCard, Shield, Bell, User, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';
import { getCurrency, setCurrency, getUserName, setUserName, getStorageInfo, requestPersistence, CURRENCIES } from '@/lib/db';

interface Props {
    showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function Settings({ showToast }: Props) {
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
                                    {storage?.persisted ? 'Persistent ✅' : 'Best Effort ⚠️'}
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
