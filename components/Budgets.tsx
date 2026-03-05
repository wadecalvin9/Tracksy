'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Target,
    Plus,
    Pencil,
    Trash2,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import type { TracksyDB, Budget, Category, Transaction } from '@/lib/db';
import { generateId } from '@/lib/db';
import RadialProgress from '@/components/RadialProgress';

interface Props {
    db: TracksyDB;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    openAddSignal?: number;
    currency: string;
}

// Moved fmt inside component to use currency prop

const blank = { categoryId: '', amount: '', period: 'monthly' as Budget['period'] };

export default function Budgets({ db, showToast, openAddSignal, currency }: Props) {
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0 }).format(n);

    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [txns, setTxns] = useState<Transaction[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Budget | null>(null);
    const [form, setForm] = useState(blank);

    const load = useCallback(async () => {
        const [b, c, t] = await Promise.all([
            db.budgets.toArray(),
            db.categories.toArray(),
            db.transactions.toArray(),
        ]);
        setBudgets(b.filter(x => !x.deletedAt)); setCategories(c); setTxns(t.filter(x => !x.deletedAt));
    }, [db]);

    useEffect(() => { load(); }, [load]);

    const openAdd = useCallback(() => {
        setEditing(null);
        // Pre-select first category that doesn't have a budget
        const noBudget = categories.filter(c => c.type === 'expense' && !budgets.find(b => String(b.categoryId) === String(c.id)));
        setForm({ ...blank, categoryId: String(noBudget[0]?.id ?? '') });
        setShowModal(true);
    }, [categories, budgets]);

    const lastSignal = useRef(openAddSignal);
    useEffect(() => {
        if (openAddSignal !== undefined && openAddSignal > (lastSignal.current ?? 0)) {
            openAdd();
        }
        lastSignal.current = openAddSignal;
    }, [openAddSignal, openAdd]);

    const catMap = Object.fromEntries(categories.map(c => [String(c.id), c]));

    // Compute this month's spending per category
    const now = new Date();
    const monthSpend: Record<string, number> = {};
    txns.forEach(tx => {
        const d = new Date(tx.date);
        if (tx.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            const cid = String(tx.categoryId);
            monthSpend[cid] = (monthSpend[cid] ?? 0) + tx.amount;
        }
    });

    const openEdit = (b: Budget) => {
        setEditing(b);
        setForm({ categoryId: String(b.categoryId), amount: b.amount.toString(), period: b.period });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.categoryId || !form.amount) { showToast('Fill all fields', 'error'); return; }
        const amount = parseFloat(form.amount);
        if (isNaN(amount) || amount <= 0) { showToast('Invalid amount', 'error'); return; }

        const payload: Budget = {
            id: editing?.id || generateId(),
            categoryId: form.categoryId,
            amount,
            period: form.period,
            startDate: editing?.startDate || new Date(now.getFullYear(), now.getMonth(), 1),
            updatedAt: new Date(),
        };

        await db.budgets.put(payload);
        showToast(editing ? 'Budget updated' : 'Budget created');
        setShowModal(false);
        load();
    };

    const handleDelete = async (b: Budget) => {
        await db.budgets.update(b.id!, { deletedAt: new Date(), updatedAt: new Date() });
        showToast('Budget deleted');
        load();
    };

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + (monthSpend[String(b.categoryId)] ?? 0), 0);
    const overBudget = budgets.filter(b => (monthSpend[String(b.categoryId)] ?? 0) > b.amount).length;
    const spentPct = Math.min((totalSpent / (totalBudget || 1)) * 100, 100);
    const noBudgetCats = categories.filter(c => c.type === 'expense' && !budgets.find(b => String(b.categoryId) === String(c.id)));
    const canAdd = noBudgetCats.length > 0;

    return (
        <>
            <div className="topbar">
                <div>
                    <div className="topbar-title" style={{ fontSize: 18 }}>Budget Management</div>
                    <div className="topbar-subtitle">Tracking {budgets.length} categories</div>
                </div>
                <div className="topbar-actions mobile-action-visible">
                    {budgets.length > 0 && (
                        <button className="btn btn-primary btn-sm" onClick={openAdd} disabled={!canAdd && !editing}>
                            <span className="hide-mobile">+ New Budget</span>
                            <span className="show-mobile">+ Budget</span>
                        </button>
                    )}
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
                        <div className="empty-icon"><Target size={32} /></div>
                        <p>No budgets yet. Create one to start tracking your spending limits.</p>
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openAdd} disabled={!canAdd}><Plus size={16} /> Create Budget</button>
                        {!canAdd && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>All expense categories already have a budget.</p>}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                        {budgets.map(b => {
                            const cat = catMap[String(b.categoryId)];
                            const spent = monthSpend[String(b.categoryId)] ?? 0;
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
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)} style={{ padding: '4px 8px' }}><Pencil size={14} /></button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b)} style={{ padding: '4px 8px' }}><Trash2 size={14} /></button>
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
                                <label className="form-label">Budget Amount ({currency || 'USD'})</label>
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
