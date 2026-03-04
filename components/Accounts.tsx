'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Landmark,
    PiggyBank,
    CreditCard,
    Coins,
    Pencil,
    Trash2,
    Plus
} from 'lucide-react';
import type { TracksyDB, Account } from '@/lib/db';
import { generateId } from '@/lib/db';

interface Props {
    db: TracksyDB;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    openAddSignal?: number;
    currency: string;
}

// Moved fmt inside component to use currency prop

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'cash'] as const;
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
const ICONS: Record<string, React.ReactNode> = {
    checking: <Landmark size={20} />,
    savings: <PiggyBank size={20} />,
    credit: <CreditCard size={20} />,
    cash: <Coins size={20} />,
};

const getBlank = (curr: string) => ({ name: '', type: 'checking' as Account['type'], balance: '', currency: curr || 'USD', color: COLORS[0] });

export default function Accounts({ db, showToast, openAddSignal, currency }: Props) {
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(n);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Account | null>(null);
    const [form, setForm] = useState(getBlank(currency));

    const load = useCallback(async () => {
        const all = await db.accounts.toArray();
        setAccounts(all.filter(a => !a.deletedAt));
    }, [db]);

    useEffect(() => { load(); }, [load]);

    const openAdd = useCallback(() => {
        setEditing(null);
        setForm(getBlank(currency));
        setShowModal(true);
    }, []);

    const lastSignal = useRef(openAddSignal);
    useEffect(() => {
        if (openAddSignal !== undefined && openAddSignal > (lastSignal.current ?? 0)) {
            openAdd();
        }
        lastSignal.current = openAddSignal;
    }, [openAddSignal, openAdd]);

    const openEdit = (acc: Account) => {
        setEditing(acc);
        setForm({ name: acc.name, type: acc.type, balance: acc.balance.toString(), currency: acc.currency, color: acc.color });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name) { showToast('Enter account name', 'error'); return; }
        const balance = parseFloat(form.balance || '0');
        const payload: Account = {
            id: editing?.id || generateId(),
            name: form.name, type: form.type, balance, currency: form.currency, color: form.color,
            createdAt: editing?.createdAt || new Date(),
            updatedAt: new Date(),
        };
        await db.accounts.put(payload);
        showToast(editing ? 'Account updated' : 'Account added');
        setShowModal(false);
        load();
    };

    const handleDelete = async (acc: Account) => {
        const txCount = await db.transactions.where('accountId').equals(acc.id!).count();
        if (txCount > 0) { showToast(`Cannot delete: ${txCount} transactions linked`, 'error'); return; }
        await db.accounts.update(acc.id!, { deletedAt: new Date(), updatedAt: new Date() });
        showToast('Account deleted');
        load();
    };

    const totalBalance = accounts.reduce((s: number, a: Account) => s + a.balance, 0);
    const totalAssets = accounts.filter((a: Account) => a.balance > 0).reduce((s: number, a: Account) => s + a.balance, 0);
    const totalDebt = accounts.filter((a: Account) => a.balance < 0).reduce((s: number, a: Account) => s + a.balance, 0);

    return (
        <>
            <div className="topbar">
                <div>
                    <div className="topbar-title">Accounts</div>
                    <div className="topbar-subtitle">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="topbar-actions mobile-action-visible">
                    {accounts.length > 0 && (
                        <button className="btn btn-primary btn-sm" onClick={openAdd}>
                            <span className="hide-mobile">+ Add Account</span>
                            <span className="show-mobile">+ Account</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="page-content">
                <div className="stat-grid" style={{ marginBottom: 24 }}>
                    <div className="stat-card accent">
                        <div className="stat-icon accent"><Wallet size={18} /></div>
                        <div className="stat-label">Net Worth</div>
                        <div className="stat-value accent">{fmt(totalBalance)}</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-icon green"><TrendingUp size={18} /></div>
                        <div className="stat-label">Total Assets</div>
                        <div className="stat-value green">{fmt(totalAssets)}</div>
                    </div>
                    <div className="stat-card red">
                        <div className="stat-icon red"><TrendingDown size={18} /></div>
                        <div className="stat-label">Total Debt</div>
                        <div className="stat-value red">{fmt(totalDebt)}</div>
                    </div>
                </div>

                {accounts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><Landmark size={32} /></div>
                        <p>No accounts yet. Add one to start tracking your finances.</p>
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openAdd}><Plus size={16} /> Add Account</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                        {accounts.map((acc: Account) => (
                            <div key={acc.id} className="account-card">
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 14,
                                            background: acc.color + '22',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 22, border: `1px solid ${acc.color}44`
                                        }}>
                                            {ICONS[acc.type] ?? '🏦'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 1 }}>{acc.type} · {acc.currency}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(acc)} style={{ padding: '4px 8px' }}><Pencil size={14} /></button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(acc)} style={{ padding: '4px 8px' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div style={{ marginTop: 20 }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Balance</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: acc.balance < 0 ? 'var(--red)' : 'var(--text-primary)' }}>
                                        {fmt(acc.balance)}
                                    </div>
                                </div>
                                <div style={{ marginTop: 16, height: 3, borderRadius: 99, background: acc.color + '33' }}>
                                    <div style={{ height: '100%', borderRadius: 99, background: acc.color, width: acc.balance >= 0 ? '100%' : '0%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-title">{editing ? 'Edit Account' : 'New Account'}</div>

                        <div className="form-group">
                            <label className="form-label">Account Name</label>
                            <input className="form-input" placeholder="e.g. Main Checking" value={form.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-input form-select" value={form.type}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, type: e.target.value as Account['type'] }))}>
                                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Initial Balance ({currency || 'USD'})</label>
                                <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.balance}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, balance: e.target.value }))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {COLORS.map((c: string) => (
                                    <div
                                        key={c}
                                        onClick={() => setForm((f: any) => ({ ...f, color: c }))}
                                        style={{
                                            width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
                                            border: form.color === c ? '2px solid white' : '2px solid transparent',
                                            transition: 'all 0.15s', transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Add Account'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
