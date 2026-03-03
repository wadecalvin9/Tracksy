'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TracksyDB, Budget, Category, Transaction } from '@/lib/db';
import RadialProgress from '@/components/RadialProgress';

interface Props {
    db: TracksyDB;
    showToast: (msg: string, type?: 'success' | 'error') => void;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function Budgets({ db, showToast }: Props) {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [txns, setTxns] = useState<Transaction[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Budget | null>(null);

    const blank: { categoryId: string; amount: string; period: 'monthly' | 'weekly' | 'yearly' } =
        { categoryId: '', amount: '', period: 'monthly' };
    const [form, setForm] = useState(blank);

    const load = useCallback(async () => {
        const [b, c, t] = await Promise.all([
            db.budgets.toArray(),
            db.categories.toArray(),
            db.transactions.toArray(),
        ]);
        setBudgets(b); setCategories(c); setTxns(t);
    }, [db]);

    useEffect(() => { load(); }, [load]);

    const catMap = Object.fromEntries(categories.map(c => [c.id!, c]));

    // Compute this month's spending per category
    const now = new Date();
    const monthSpend: Record<number, number> = {};
    txns.forEach(tx => {
        const d = new Date(tx.date);
        if (tx.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            monthSpend[tx.categoryId] = (monthSpend[tx.categoryId] ?? 0) + tx.amount;
        }
    });

    const openAdd = () => {
        setEditing(null);
        const noBudget = categories.filter(c => c.type === 'expense' && !budgets.find(b => b.categoryId === c.id));
        setForm({ ...blank, categoryId: noBudget[0]?.id?.toString() ?? '' });
        setShowModal(true);
    };

    const openEdit = (b: Budget) => {
        setEditing(b);
        setForm({ categoryId: b.categoryId.toString(), amount: b.amount.toString(), period: b.period });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.categoryId || !form.amount) { showToast('Fill all fields', 'error'); return; }
        const amount = parseFloat(form.amount);
        if (isNaN(amount) || amount <= 0) { showToast('Invalid amount', 'error'); return; }

        const payload: Omit<Budget, 'id'> = {
            categoryId: parseInt(form.categoryId),
            amount,
            period: form.period,
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        };

        if (editing) {
            await db.budgets.update(editing.id!, payload);
            showToast('Budget updated');
        } else {
            await db.budgets.add(payload);
            showToast('Budget created');
        }
        setShowModal(false);
        load();
    };

    const handleDelete = async (b: Budget) => {
        await db.budgets.delete(b.id!);
        showToast('Budget deleted');
        load();
    };

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + (monthSpend[b.categoryId] ?? 0), 0);
    const overBudget = budgets.filter(b => (monthSpend[b.categoryId] ?? 0) > b.amount).length;
    const spentPct = Math.min((totalSpent / (totalBudget || 1)) * 100, 100);

    const noBudgetCats = categories.filter(c => c.type === 'expense' && !budgets.find(b => b.categoryId === c.id));

    return (
        <>
            <div className="topbar">
                <div>
                    <div className="topbar-title" style={{ fontSize: 18 }}>Budget Management</div>
                    <div className="topbar-subtitle">Tracking {budgets.length} categories</div>
                </div>
                <div className="topbar-actions">
                    <button className="btn btn-primary" onClick={openAdd} disabled={noBudgetCats.length === 0 && !editing}>
                        + New Budget
                    </button>
                </div>
            </div>

            <div className="page-content">
                {/* Visual Header inspired by Reference */}
                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px',
                    borderRadius: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <RadialProgress percent={spentPct} size={150} strokeWidth={12} color={totalSpent > totalBudget ? 'var(--red)' : 'var(--accent)'}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Main balance</div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(totalBudget - totalSpent)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Remaining</div>
                        </div>
                    </RadialProgress>

                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 28, width: '100%', justifyContent: 'center' }} className="budget-summary-stats">
                        <div style={{ textAlign: 'center', flex: '1 1 100px' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Total Budget</div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{fmt(totalBudget)}</div>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} className="hide-mobile" />
                        <div style={{ textAlign: 'center', flex: '1 1 100px' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Used Balance</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: totalSpent > totalBudget * 0.9 ? 'var(--red)' : 'var(--text-primary)' }}>
                                {fmt(totalSpent)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stat chips */}
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, marginBottom: 8, flexWrap: 'nowrap' }} className="filter-bar">
                    <div className="stat-card" style={{ flex: '0 0 140px', padding: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>CATEGORIES</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{budgets.length}</div>
                    </div>
                    <div className="stat-card" style={{ flex: '0 0 140px', padding: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>OVER BUDGET</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: overBudget > 0 ? 'var(--red)' : 'var(--text-primary)' }}>{overBudget}</div>
                    </div>
                    <div className="stat-card" style={{ flex: '0 0 140px', padding: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>UTILIZATION</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{Math.round(spentPct)}%</div>
                    </div>
                </div>

                {/* Budget cards grid */}
                {budgets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🎯</div>
                        <p>No budgets yet. Create one to start tracking your spending limits.</p>
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openAdd}>+ Create Budget</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                        {budgets.map(b => {
                            const cat = catMap[b.categoryId];
                            const spent = monthSpend[b.categoryId] ?? 0;
                            const pct = Math.min((spent / b.amount) * 100, 100);
                            const over = spent > b.amount;
                            const warn = pct > 80;
                            const barColor = over ? 'var(--red)' : warn ? 'var(--amber)' : 'var(--green)';

                            return (
                                <div key={b.id} className="budget-card">
                                    <div className="budget-header">
                                        <div className="budget-cat">
                                            <span className="budget-icon">{cat?.icon ?? '📦'}</span>
                                            <div>
                                                <div className="budget-name">{cat?.name ?? 'Unknown'}</div>
                                                <div className="budget-amounts" style={{ color: over ? 'var(--red)' : 'var(--text-muted)' }}>
                                                    {fmt(spent)} / {fmt(b.amount)}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                            <span className="budget-pct" style={{ color: barColor }}>{Math.round(pct)}%</span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)} style={{ padding: '4px 8px' }}>✏️</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b)} style={{ padding: '4px 8px' }}>🗑️</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                        <span>{b.period}</span>
                                        {over
                                            ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>Over by {fmt(spent - b.amount)}</span>
                                            : <span>{fmt(b.amount - spent)} left</span>
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-title">{editing ? 'Edit Budget' : 'New Budget'}</div>

                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-input form-select" value={form.categoryId}
                                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                                <option value="">Select category</option>
                                {editing
                                    ? categories.filter(c => c.type === 'expense').map(c => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))
                                    : noBudgetCats.map(c => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Budget Amount (USD)</label>
                                <input className="form-input" type="number" placeholder="0.00" min="0" step="0.01"
                                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Period</label>
                                <select className="form-input form-select" value={form.period}
                                    onChange={e => setForm(f => ({ ...f, period: e.target.value as Budget['period'] }))}>
                                    <option value="monthly">Monthly</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {editing ? 'Save Changes' : 'Create Budget'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
