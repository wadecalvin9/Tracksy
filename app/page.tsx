'use client';

import { useEffect, useState } from 'react';
import { db, seedDefaultData } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Dashboard from '@/components/Dashboard';
import Transactions from '@/components/Transactions';
import Budgets from '@/components/Budgets';
import Accounts from '@/components/Accounts';
import Reports from '@/components/Reports';
import Toast from '@/components/Toast';

export type Page = 'dashboard' | 'transactions' | 'budgets' | 'accounts' | 'reports';

export interface ToastMsg { id: number; message: string; type: 'success' | 'error'; }

export default function Home() {
  const [page, setPage] = useState<Page>('dashboard');
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  // Signals to components to open their add modals
  const [openAddTx, setOpenAddTx] = useState(0);
  const [openAddBudget, setOpenAddBudget] = useState(0);
  const [openAddAccount, setOpenAddAccount] = useState(0);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  useEffect(() => {
    seedDefaultData().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💸</div>
          <p style={{ fontSize: 14 }}>Loading Tracksy…</p>
        </div>
      </div>
    );
  }

  const handleFab = () => {
    if (page === 'budgets') {
      setOpenAddBudget(n => n + 1);
    } else if (page === 'accounts') {
      setOpenAddAccount(n => n + 1);
    } else {
      setPage('transactions');
      setOpenAddTx(n => n + 1);
    }
  };

  const pageProps = { db, showToast };

  return (
    <div className="app-shell">
      <Sidebar activePage={page} onNavigate={setPage} />

      <div className="main-content">
        {page === 'dashboard' && <Dashboard    {...pageProps} onNavigate={setPage} />}
        {page === 'transactions' && <Transactions {...pageProps} openAddSignal={openAddTx} />}
        {page === 'budgets' && <Budgets      {...pageProps} openAddSignal={openAddBudget} />}
        {page === 'accounts' && <Accounts     {...pageProps} openAddSignal={openAddAccount} />}
        {page === 'reports' && <Reports      {...pageProps} />}
      </div>

      {/* Mobile-only bottom navigation */}
      <BottomNav activePage={page} onNavigate={setPage} onAdd={handleFab} />

      <Toast toasts={toasts} />
    </div>
  );
}
