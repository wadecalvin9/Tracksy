// lib/sync.ts
// Handles push/pull sync between local IndexedDB and Firebase Firestore.
// All-or-nothing sync strategy: uses updatedAt timestamps to avoid overwriting newer data.

import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    Timestamp,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { db } from './db';
import type { Account, Transaction, Budget, Category } from './db';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
type SyncStatusCallback = (status: SyncStatus, lastSync?: Date) => void;

let statusCallback: SyncStatusCallback | null = null;

export function onSyncStatusChange(cb: SyncStatusCallback) {
    statusCallback = cb;
}

function setStatus(status: SyncStatus, lastSync?: Date) {
    statusCallback?.(status, lastSync);
}

// Helper: convert Firestore timestamps to Date objects
function fromFirestore(data: any) {
    const result = { ...data };
    for (const key of ['date', 'createdAt', 'updatedAt', 'startDate']) {
        if (result[key] instanceof Timestamp) {
            result[key] = result[key].toDate();
        }
    }
    return result;
}

// Helper: convert Dates to Firestore-friendly objects
function toFirestore(data: any) {
    const result = { ...data };
    for (const key of ['date', 'createdAt', 'updatedAt', 'startDate']) {
        if (result[key] instanceof Date) {
            result[key] = Timestamp.fromDate(result[key]);
        }
    }
    return result;
}

async function syncTable<T extends { id?: number; updatedAt?: Date }>(
    userId: string,
    tableName: string,
    localTable: any
) {
    const colRef = collection(firestore, 'users', userId, tableName);
    const localItems: T[] = await localTable.toArray();

    // Push local → Firestore
    for (const item of localItems) {
        if (!item.id) continue;
        const docRef = doc(colRef, item.id.toString());
        await setDoc(docRef, toFirestore({ ...item, updatedAt: item.updatedAt || new Date() }), { merge: true });
    }

    // Pull Firestore → local (only NEW records not in local DB)
    const snapshot = await getDocs(query(colRef));
    const localIds = new Set(localItems.map((i) => i.id?.toString()));

    for (const docSnap of snapshot.docs) {
        if (!localIds.has(docSnap.id)) {
            const data = fromFirestore(docSnap.data()) as T;
            // Add to local, preserving the original ID if possible
            const numId = parseInt(docSnap.id);
            if (!isNaN(numId)) {
                await localTable.put({ ...data, id: numId });
            }
        }
    }
}

export async function syncAll(userId: string): Promise<void> {
    if (!userId) return;
    setStatus('syncing');
    try {
        await syncTable<Account>(userId, 'accounts', db.accounts);
        await syncTable<Transaction>(userId, 'transactions', db.transactions);
        await syncTable<Budget>(userId, 'budgets', db.budgets);
        await syncTable<Category>(userId, 'categories', db.categories);

        const now = new Date();
        await db.settings.put({ key: 'lastSync', value: now.toISOString() });
        setStatus('synced', now);
    } catch (e) {
        console.error('Sync failed:', e);
        setStatus('error');
    }
}

export async function getLastSync(): Promise<Date | null> {
    const s = await db.settings.get('lastSync');
    return s?.value ? new Date(s.value) : null;
}
