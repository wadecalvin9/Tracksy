'use client';

import { useState, useEffect } from 'react';
import { Cog, Globe, CreditCard, Shield, Bell, User } from 'lucide-react';
import { getCurrency, setCurrency, getUserName, setUserName, CURRENCIES } from '@/lib/db';

interface Props {
    showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function Settings({ showToast }: Props) {
    const [currency, setCurr] = useState('USD');
    const [userName, setUName] = useState('User');

    useEffect(() => {
        getCurrency().then(setCurr);
        getUserName().then(setUName);
    }, []);

    const handleNameChange = async (name: string) => {
        await setUserName(name);
        setUName(name);
        showToast('Name updated');
    };

    const handleCurrencyChange = async (code: string) => {
        await setCurrency(code);
        setCurr(code);
        showToast(`Currency changed to ${code}`);
        // Optionally reload to update all UI
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
                                    className="btn-primary"
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
                        <div className="setting-placeholder">Coming soon in next update</div>
                    </section>

                    <section className="settings-section disabled">
                        <div className="section-header">
                            <Bell size={20} className="section-icon" />
                            <div>
                                <h3 className="section-title">Notifications</h3>
                                <p className="section-desc">Configure alerts and reminders</p>
                            </div>
                        </div>
                        <div className="setting-placeholder">Coming soon in next update</div>
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
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 24px;
                }
                .settings-section.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .section-header {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .section-icon {
                    color: var(--accent);
                    margin-top: 2px;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }
                .section-desc {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin: 2px 0 0;
                }
                .currency-selector {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 12px;
                    margin-top: 12px;
                }
                .currency-chip {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 16px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: var(--text-secondary);
                }
                .currency-chip:hover:not(.active) {
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.1);
                }
                .currency-chip.active {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: var(--accent);
                    color: var(--accent);
                }
                .curr-symbol {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .curr-code {
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                }
                .setting-placeholder {
                    padding: 20px;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 13px;
                    border: 1px dashed rgba(255,255,255,0.1);
                    border-radius: 12px;
                }
            `}</style>
        </div>
    );
}
