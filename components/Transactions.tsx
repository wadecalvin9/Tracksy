'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    ArrowUpCircle,
    ArrowDownCircle,
    Receipt
} from 'lucide-react';
import type { TracksyDB, Transaction, Account, Category } from '@/lib/db';
import { generateId } from '@/lib/db';

interface Props {
    db: TracksyDB;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    openAddSignal?: number;
    currency: string;
}

// Moved fmt inside component to use currency prop

const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const toInputDate = (d: Date) => new Date(d).toISOString().slice(0, 10);

export default function Transactions({ db, showToast, openAddSignal, currency }: Props) {
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(n);

    const [txns, setTxns] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);

    // Form state — widened type so toggling income/expense works without TS error
    const blank: { type: 'income' | 'expense'; amount: string; description: string; accountId: string; categoryId: string; date: string } =
        { type: 'expense', amount: '', description: '', accountId: '', categoryId: '', date: toInputDate(new Date()) };
    const [form, setForm] = useState(blank);

    // Open add modal when FAB fires signal
    useEffect(() => {
        if (openAddSignal) openAdd();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openAddSignal]);

    const load = useCallback(async () => {
        const [t, a, c] = await Promise.all([
            db.transactions.orderBy('date').reverse().toArray(),
            db.accounts.toArray(),
            db.categories.toArray(),
        ]);
        setTxns(t.filter(tx => !tx.deletedAt)); setAccounts(a); setCategories(c);
    }, [db]);

    useEffect(() => { load(); }, [load]);

    const catMap = Object.fromEntries(categories.map(c => [String(c.id), c]));
    const accMap = Object.fromEntries(accounts.map(a => [String(a.id), a]));

    const filtered = txns.filter(t => {
        if (filter !== 'all' && t.type !== filter) return false;
        if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const openAdd = () => {
        setEditing(null);
        setForm({ ...blank, accountId: String(accounts[0]?.id ?? ''), categoryId: String(categories[0]?.id ?? '') });
        setShowModal(true);
    };

    const openEdit = (tx: Transaction) => {
        setEditing(tx);
        setForm({
            type: tx.type as 'income' | 'expense',
            amount: tx.amount.toString(),
            description: tx.description,
            accountId: String(tx.accountId),
            categoryId: String(tx.categoryId),
            date: toInputDate(tx.date),
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.amount || !form.description || !form.accountId || !form.categoryId) {
            showToast('Please fill all fields', 'error'); return;
        }
        const amount = parseFloat(form.amount);
        if (isNaN(amount) || amount <= 0) { showToast('Invalid amount', 'error'); return; }

        const payload: Transaction = {
            id: editing?.id || generateId(),
            type: form.type,
            amount,
            description: form.description,
            accountId: form.accountId,
            categoryId: form.categoryId,
            date: new Date(form.date),
            createdAt: editing?.createdAt || new Date(),
            updatedAt: new Date(),
        };

        // Atomic account balance update: read LATEST from DB
        const accId = payload.accountId;
        const latestAcc = (await db.accounts.get(accId)) || (!isNaN(Number(accId)) ? await db.accounts.get(Number(accId)) : null);

        if (latestAcc) {
            let delta = payload.type === 'income' ? payload.amount : -payload.amount;
            const finalBalance = editing
                ? latestAcc.balance + (editing.type === 'income' ? -editing.amount : editing.amount) + delta
                : latestAcc.balance + delta;

            const updatePayload = { balance: finalBalance, updatedAt: new Date() };
            const updated = await db.accounts.update(accId, updatePayload);
            if (updated === 0 && !isNaN(Number(accId))) {
                await db.accounts.update(Number(accId), updatePayload);
            }
        }

        await db.transactions.put(payload);
        showToast(editing ? 'Transaction updated' : 'Transaction added');

        setShowModal(false);
        load();
    };

    const handleDelete = async (tx: Transaction) => {
        const accId = tx.accountId;
        const latestAcc = (await db.accounts.get(accId)) || (!isNaN(Number(accId)) ? await db.accounts.get(Number(accId)) : null);

        if (latestAcc) {
            const delta = tx.type === 'income' ? -tx.amount : tx.amount;
            const finalBalance = latestAcc.balance + delta;
            const updatePayload = { balance: finalBalance, updatedAt: new Date() };
            const updated = await db.accounts.update(accId, updatePayload);
            if (updated === 0 && !isNaN(Number(accId))) {
                await db.accounts.update(Number(accId), updatePayload);
            }
        }
        await db.transactions.update(tx.id!, { deletedAt: new Date(), updatedAt: new Date() });
        showToast('Transaction deleted');
        load();
    };

    const expenseCats = categories.filter(c => c.type === 'expense');
    const incomeCats = categories.filter(c => c.type === 'income');
    const formCats = form.type === 'income' ? incomeCats : expenseCats;

    return (
        <>
            <div className="topbar">
                <div>
                    <div className="topbar-title">Transactions</div>
                    <div className="topbar-subtitle">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="topbar-actions">
                    <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Transaction</button>
                </div>
            </div>

            <div className="page-content">
                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="filter-bar">
                        {(['all', 'income', 'expense'] as const).map(f => (
                            <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <input
                            className="form-input"
                            style={{ width: '100%' }}
                            placeholder="Search transactions…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><Search size={32} /></div>
                            <p>No transactions found. Try changing your filters or add a new transaction.</p>
                        </div>
                    ) : (
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Transaction</th>
                                        <th>Account</th>
                                        <th>Type</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th>Date</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(tx => {
                                        const cat = catMap[tx.categoryId];
                                        const acc = accMap[tx.accountId];
                                        return (
                                            <tr key={tx.id}>
                                                <td>
                                                    <div className="tx-row">
                                                        <div className="tx-icon" style={{ background: cat ? cat.color + '22' : '#ffffff11' }}>
                                                            {cat?.icon ? <span>{cat.icon}</span> : <Receipt size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="tx-name">{tx.description}</div>
                                                            <div className="tx-sub">{cat?.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{acc?.name ?? '—'}</td>
                                                <td><span className={`badge ${tx.type}`}>{tx.type}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span className={`amount ${tx.type === 'income' ? 'positive' : 'negative'}`}>
                                                        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(tx.date)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tx)}><Pencil size={14} /></button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tx)}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-title">{editing ? 'Edit Transaction' : 'New Transaction'}</div>

                        <div className="form-group">
                            <div className="type-toggle">
                                {(['expense', 'income'] as const).map(t => (
                                    <button
                                        key={t}
                                        className={`type-btn${form.type === t ? ` active-${t}` : ''}`}
                                        onClick={() => setForm(f => ({ ...f, type: t, categoryId: '' }))}
                                    >
                                        {t === 'income' ? <><ArrowUpCircle size={14} style={{ marginRight: 4 }} /> Income</> : <><ArrowDownCircle size={14} style={{ marginRight: 4 }} /> Expense</>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Amount ({currency || 'USD'})</label>
                                <input className="form-input" type="number" placeholder="0.00" min="0" step="0.01"
                                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input className="form-input" type="date" value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input className="form-input" placeholder="e.g. Grocery shopping" value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Account</label>
                                <select className="form-input form-select" value={form.accountId}
                                    onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                                    <option value="">Select account</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-input form-select" value={form.categoryId}
                                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                                    <option value="">Select category</option>
                                    {formCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {editing ? 'Save Changes' : 'Add Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
