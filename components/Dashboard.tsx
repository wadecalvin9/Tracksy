'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TracksyDB, Transaction, Account, Category, Budget } from '@/lib/db';
import type { Page } from '@/app/page';

interface Props {
    db: TracksyDB;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    onNavigate: (p: Page) => void;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard({ db, showToast, onNavigate }: Props) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [txns, setTxns] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);

    const load = useCallback(async () => {
        const [a, t, c, b] = await Promise.all([
            db.accounts.toArray(),
            db.transactions.orderBy('date').reverse().toArray(),
            db.categories.toArray(),
            db.budgets.toArray(),
        ]);
        setAccounts(a); setTxns(t); setCategories(c); setBudgets(b);
    }, [db]);

    useEffect(() => { load(); }, [load]);

    const netWorth = accounts.reduce((s, a) => s + a.balance, 0);
    const now = new Date();
    const thisMonth = txns.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const monthIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = monthIncome - monthExpense;

    // Bar chart: last 6 months expenses
    const barData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const total = txns.filter(t => {
            const td = new Date(t.date);
            return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() && t.type === 'expense';
        }).reduce((s, t) => s + t.amount, 0);
        return { label: MONTHS[d.getMonth()], value: total };
    });
    const maxBar = Math.max(...barData.map(b => b.value), 1);

    const catMap = Object.fromEntries(categories.map(c => [c.id!, c]));
    const recent = txns.slice(0, 8);

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        border: '2px solid rgba(255,255,255,0.1)'
                    }}>
                        👤
                    </div>
                    <div>
                        <div className="topbar-subtitle" style={{ fontSize: 11, marginBottom: -2 }}>Hello!</div>
                        <div className="topbar-title" style={{ fontSize: 16 }}>Daisy Murphy</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 20, cursor: 'pointer', position: 'relative' }}>
                        🔔
                        <div style={{
                            position: 'absolute', top: 2, right: 0, width: 8, height: 8,
                            background: 'var(--red)', borderRadius: '50%', border: '2px solid var(--bg-secondary)'
                        }} />
                    </div>
                    <div className="topbar-actions">
                        <button className="btn btn-primary" onClick={() => onNavigate('transactions')}>
                            + Add Transaction
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Net Worth Banner */}
                <div className="net-worth-banner">
                    <div>
                        <div className="net-worth-label">Total Net Worth</div>
                        <div className="net-worth-value" style={{ color: netWorth >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {fmt(netWorth)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }} className="net-worth-stats-container">
                        <div className="net-worth-mini">
                            <div className="net-worth-mini-label">↑ Income this month</div>
                            <div className="net-worth-mini-value" style={{ color: 'var(--green)' }}>{fmt(monthIncome)}</div>
                        </div>
                        <div className="net-worth-mini">
                            <div className="net-worth-mini-label">↓ Expenses this month</div>
                            <div className="net-worth-mini-value" style={{ color: 'var(--red)' }}>{fmt(monthExpense)}</div>
                        </div>
                        <div className="net-worth-mini">
                            <div className="net-worth-mini-label">💰 Savings</div>
                            <div className="net-worth-mini-value" style={{ color: savings >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(savings)}</div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Budget Overview replaces Hardcoded Savings Plan */}
                <div style={{ margin: '24px 0' }}>
                    <div className="section-header">
                        <span className="section-title">Budget Overview</span>
                        <span className="section-action" onClick={() => onNavigate('budgets')}>Manage all →</span>
                    </div>
                    {budgets.length === 0 ? (
                        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No budgets set yet</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Set spending limits to track your progress</div>
                            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('budgets')}>Set your first budget</button>
                        </div>
                    ) : (
                        <div className="two-col" style={{ gap: 12 }}>
                            {budgets.slice(0, 2).map(b => {
                                const cat = catMap[b.categoryId];
                                const spent = txns.filter(t => {
                                    const d = new Date(t.date);
                                    return t.type === 'expense' &&
                                        t.categoryId === b.categoryId &&
                                        d.getMonth() === now.getMonth() &&
                                        d.getFullYear() === now.getFullYear();
                                }).reduce((s, t) => s + t.amount, 0);
                                const pct = Math.min((spent / b.amount) * 100, 100);
                                const over = spent > b.amount;

                                return (
                                    <div key={b.id} className="card" style={{ padding: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                                                <span style={{ fontSize: 13, fontWeight: 700 }}>{cat?.name}</span>
                                            </div>
                                            <span className={`badge ${over ? 'expense' : 'income'}`} style={{ fontSize: 9 }}>
                                                {over ? 'Over Limit' : 'On Track'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                            <span>{fmt(spent)}</span>
                                            <span>{fmt(b.amount)}</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: 4 }}>
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: over ? 'var(--red)' : 'var(--accent)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Stat cards */}
                <div className="stat-grid">
                    <div className="stat-card accent">
                        <div className="stat-icon accent">💼</div>
                        <div className="stat-label">Total Balance</div>
                        <div className="stat-value accent">{fmt(netWorth)}</div>
                        <div className="stat-change">All accounts combined</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-icon green">📥</div>
                        <div className="stat-label">Income</div>
                        <div className="stat-value green">{fmt(monthIncome)}</div>
                        <div className="stat-change">This month</div>
                    </div>
                    <div className="stat-card red">
                        <div className="stat-icon red">📤</div>
                        <div className="stat-label">Expenses</div>
                        <div className="stat-value red">{fmt(monthExpense)}</div>
                        <div className="stat-change">This month</div>
                    </div>
                    <div className="stat-card amber">
                        <div className="stat-icon amber">💳</div>
                        <div className="stat-label">Transactions</div>
                        <div className="stat-value amber">{thisMonth.length}</div>
                        <div className="stat-change">This month</div>
                    </div>
                </div>

                <div className="two-col">
                    {/* Recent Transactions */}
                    <div className="card">
                        <div className="section-header">
                            <span className="section-title">Recent Transactions</span>
                            <span className="section-action" onClick={() => onNavigate('transactions')}>View all →</span>
                        </div>
                        {recent.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <p>No transactions yet. Add one to get started!</p>
                            </div>
                        ) : (
                            <table className="data-table fit-table">
                                <thead>
                                    <tr>
                                        <th>Transaction</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map(tx => {
                                        const cat = catMap[tx.categoryId];
                                        return (
                                            <tr key={tx.id}>
                                                <td>
                                                    <div className="tx-row">
                                                        <div className="tx-icon" style={{ background: cat ? cat.color + '22' : '#ffffff11' }}>
                                                            {cat?.icon ?? '💸'}
                                                        </div>
                                                        <div>
                                                            <div className="tx-name">{tx.description}</div>
                                                            <div className="tx-sub">{cat?.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`amount ${tx.type === 'income' ? 'positive' : 'negative'}`}>
                                                        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(tx.date)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* 6-month chart */}
                    <div className="card">
                        <div className="section-header">
                            <span className="section-title">Spending — Last 6 Months</span>
                        </div>
                        <div className="chart-wrapper">
                            <div className="chart-bars">
                                {barData.map((b, i) => (
                                    <div key={i} className="chart-bar-wrap">
                                        <div
                                            className="chart-bar-inner"
                                            style={{
                                                height: `${(b.value / maxBar) * 100}%`,
                                                background: i === 5
                                                    ? 'var(--accent)'
                                                    : 'rgba(99,102,241,0.3)',
                                            }}
                                            title={fmt(b.value)}
                                        />
                                        <span className="chart-label">{b.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                This month: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{fmt(monthExpense)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Accounts */}
                <div style={{ marginTop: 20 }}>
                    <div className="section-header">
                        <span className="section-title">Accounts</span>
                        <span className="section-action" onClick={() => onNavigate('accounts')}>Manage →</span>
                    </div>
                    <div className="three-col">
                        {accounts.map(acc => (
                            <div key={acc.id} className="account-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <div className="account-dot" style={{ background: acc.color }} />
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{acc.name}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{acc.type}</span>
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: acc.balance < 0 ? 'var(--red)' : 'var(--text-primary)' }}>
                                    {fmt(acc.balance)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
