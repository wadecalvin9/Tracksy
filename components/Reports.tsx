'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TracksyDB, Transaction, Category } from '@/lib/db';

interface Props {
    db: TracksyDB;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    currency: string;
}

// Moved fmt inside component to use currency prop

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Reports({ db, showToast, currency }: Props) {
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0 }).format(n);

    const [txns, setTxns] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

    const load = useCallback(async () => {
        const [t, c] = await Promise.all([
            db.transactions.orderBy('date').reverse().toArray(),
            db.categories.toArray(),
        ]);
        setTxns(t); setCategories(c);
    }, [db]);

    useEffect(() => { load(); }, [load]);

    const catMap = Object.fromEntries(categories.map(c => [c.id!, c]));
    const now = new Date();

    // Filter by period
    const filtered = txns.filter(tx => {
        const d = new Date(tx.date);
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === 'quarter') {
            const q = Math.floor(now.getMonth() / 3);
            return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
        }
        return d.getFullYear() === now.getFullYear();
    });

    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    // Spending by category
    const byCat: Record<string, number> = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
        byCat[t.categoryId] = (byCat[t.categoryId] ?? 0) + t.amount;
    });

    const catRanked = Object.entries(byCat)
        .map(([id, amt]) => ({ cat: catMap[id], amt }))
        .filter(x => x.cat)
        .sort((a, b) => b.amt - a.amt);

    const maxCatAmt = catRanked[0]?.amt ?? 1;

    // Monthly trend (last 6 months income vs expense)
    const trend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const m = txns.filter(t => {
            const td = new Date(t.date);
            return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
        });
        return {
            label: MONTHS[d.getMonth()],
            income: m.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expense: m.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        };
    });

    const maxTrend = Math.max(...trend.flatMap(t => [t.income, t.expense]), 1);

    // Top income sources
    const byIncomeCat: Record<string, number> = {};
    filtered.filter(t => t.type === 'income').forEach(t => {
        byIncomeCat[t.categoryId] = (byIncomeCat[t.categoryId] ?? 0) + t.amount;
    });
    const incomeRanked = Object.entries(byIncomeCat)
        .map(([id, amt]) => ({ cat: catMap[id], amt }))
        .filter(x => x.cat)
        .sort((a, b) => b.amt - a.amt);

    return (
        <>
            <div className="topbar">
                <div>
                    <div className="topbar-title">Reports</div>
                    <div className="topbar-subtitle">Financial overview & analytics</div>
                </div>
                <div className="topbar-actions">
                    <div className="filter-bar">
                        {(['month', 'quarter', 'year'] as const).map(p => (
                            <button key={p} className={`filter-chip${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
                                {p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : 'This Year'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Summary stats */}
                <div className="stat-grid" style={{ marginBottom: 24 }}>
                    <div className="stat-card green">
                        <div className="stat-icon green">📥</div>
                        <div className="stat-label">Total Income</div>
                        <div className="stat-value green">{fmt(income)}</div>
                    </div>
                    <div className="stat-card red">
                        <div className="stat-icon red">📤</div>
                        <div className="stat-label">Total Expenses</div>
                        <div className="stat-value red">{fmt(expense)}</div>
                    </div>
                    <div className="stat-card accent">
                        <div className="stat-icon accent">💰</div>
                        <div className="stat-label">Net Savings</div>
                        <div className="stat-value accent" style={{ color: savings >= 0 ? '#818cf8' : 'var(--red)' }}>{fmt(savings)}</div>
                    </div>
                    <div className="stat-card amber">
                        <div className="stat-icon amber">📊</div>
                        <div className="stat-label">Savings Rate</div>
                        <div className="stat-value amber">{savingsRate.toFixed(1)}%</div>
                    </div>
                </div>

                <div className="two-col" style={{ marginBottom: 20 }}>
                    {/* Income vs Expense trend bars */}
                    <div className="card">
                        <div className="section-header">
                            <span className="section-title">Income vs Expenses (6 months)</span>
                        </div>
                        <div style={{ display: 'flex', height: 140, gap: 6, alignItems: 'flex-end', paddingTop: 12 }}>
                            {trend.map((t, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                                        <div style={{
                                            flex: 1, background: 'var(--green)', opacity: 0.7, borderRadius: '4px 4px 0 0',
                                            height: `${(t.income / maxTrend) * 100}%`, transition: 'height 0.5s', minHeight: 2
                                        }} />
                                        <div style={{
                                            flex: 1, background: 'var(--red)', opacity: 0.7, borderRadius: '4px 4px 0 0',
                                            height: `${(t.expense / maxTrend) * 100}%`, transition: 'height 0.5s', minHeight: 2
                                        }} />
                                    </div>
                                    <span className="chart-label">{t.label}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--green)', opacity: 0.7 }} />
                                Income
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--red)', opacity: 0.7 }} />
                                Expenses
                            </div>
                        </div>
                    </div>

                    {/* Income sources */}
                    <div className="card">
                        <div className="section-header">
                            <span className="section-title">Income Sources</span>
                        </div>
                        {incomeRanked.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}>
                                <div className="empty-icon" style={{ fontSize: 24 }}>📭</div>
                                <p>No income recorded</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {incomeRanked.map(({ cat, amt }) => (
                                    <div key={cat.id}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.name}</span>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmt(amt)}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${(amt / income) * 100}%`, background: cat.color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Expense breakdown */}
                <div className="card">
                    <div className="section-header">
                        <span className="section-title">Expense Breakdown</span>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total: {fmt(expense)}</span>
                    </div>
                    {catRanked.length === 0 ? (
                        <div className="empty-state" style={{ padding: 24 }}>
                            <div className="empty-icon" style={{ fontSize: 24 }}>📭</div>
                            <p>No expenses recorded for this period</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {catRanked.map(({ cat, amt }) => (
                                <div key={cat.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: 8,
                                                background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 16, border: `1px solid ${cat.color}33`
                                            }}>
                                                {cat.icon}
                                            </div>
                                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{cat.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {((amt / expense) * 100).toFixed(1)}%
                                            </span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', minWidth: 80, textAlign: 'right' }}>
                                                {fmt(amt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${(amt / maxCatAmt) * 100}%`, background: cat.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
