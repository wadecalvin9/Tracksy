'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { db, seedInfrastructure, getCurrency, getUserName, requestPersistence } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { syncAll, onSyncStatusChange, getLastSync } from '@/lib/sync';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Dashboard from '@/components/Dashboard';
import Transactions from '@/components/Transactions';
import Budgets from '@/components/Budgets';
import Accounts from '@/components/Accounts';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
import Toast from '@/components/Toast';
import AuthModal from '@/components/AuthModal';
import type { User } from 'firebase/auth';

export type Page = 'dashboard' | 'transactions' | 'budgets' | 'accounts' | 'reports' | 'settings';
export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
export interface ToastMsg { id: number; message: string; type: 'success' | 'error'; }

export default function Home() {
  const [page, setPage] = useState<Page>('dashboard');
  const [ready, setReady] = useState(false);
  const [currency, setCurrencyState] = useState('USD');
  const [userName, setUserNameState] = useState('User');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Cloud sync state
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Signals to components to open their add modals
  const [openAddTx, setOpenAddTx] = useState(0);
  const [openAddBudget, setOpenAddBudget] = useState(0);
  const [openAddAccount, setOpenAddAccount] = useState(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const handleSync = useCallback(async (uid: string) => {
    await syncAll(uid);
    const lastSyncDate = await getLastSync();
    setLastSync(lastSyncDate);
  }, []);

  // Listen for sync status changes from sync engine
  useEffect(() => {
    onSyncStatusChange((status, ts) => {
      setSyncState(status as SyncState);
      if (ts) setLastSync(ts);
    });
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Sync when user logs in
        handleSync(firebaseUser.uid);
      }
    });
    return () => unsub();
  }, [handleSync]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        setSyncState('syncing');
        handleSync(user.uid);
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => setSyncState('offline'));
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', () => setSyncState('offline'));
    };
  }, [user, handleSync]);

  useEffect(() => {
    seedInfrastructure().then(() => {
      Promise.all([
        getCurrency().then(setCurrencyState),
        getUserName().then(setUserNameState),
        getLastSync().then(setLastSync),
        requestPersistence()
      ]).then(() => setReady(true));
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setSyncState('idle');
    showToast('Signed out');
  }, [showToast]);

  const handleSyncNow = useCallback(() => {
    if (user) handleSync(user.uid);
    else setShowAuthModal(true);
  }, [user, handleSync]);

  const pageProps = useMemo(() => ({ db, showToast, currency, userName }), [showToast, currency, userName]);

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

  return (
    <div className="app-shell">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        user={user}
        syncState={syncState}
        lastSync={lastSync}
        onSignInClick={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onSyncNow={handleSyncNow}
      />

      <div className="main-content">
        {page === 'dashboard' && <Dashboard    {...pageProps} onNavigate={setPage} />}
        {page === 'transactions' && <Transactions {...pageProps} openAddSignal={openAddTx} />}
        {page === 'budgets' && <Budgets      {...pageProps} openAddSignal={openAddBudget} />}
        {page === 'accounts' && <Accounts     {...pageProps} openAddSignal={openAddAccount} />}
        {page === 'reports' && <Reports      {...pageProps} />}
        {page === 'settings' && <Settings     {...pageProps} user={user} syncState={syncState} lastSync={lastSync} onSignInClick={() => setShowAuthModal(true)} onSignOut={handleSignOut} onSyncNow={handleSyncNow} />}
      </div>

      {/* Mobile-only bottom navigation */}
      <BottomNav activePage={page} onNavigate={setPage} onAdd={handleFab} />

      {showAuthModal && (
        <AuthModal
          onSignedIn={(u) => { setUser(u); showToast('Signed in! Syncing…'); }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
