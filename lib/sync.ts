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

async function syncTable<T extends { updatedAt?: Date; deletedAt?: Date }>(
    userId: string,
    tableName: string,
    localTable: any,
    idKey: string = 'id'
) {
    const colRef = collection(firestore, 'users', userId, tableName);
    const localItems: any[] = await localTable.toArray();
    const snapshot = await getDocs(query(colRef));
    const remoteItems = new Map(snapshot.docs.map(d => [d.id, fromFirestore(d.data())]));

    // 1. Local -> Remote
    for (const local of localItems) {
        const id = local[idKey]?.toString();
        if (!id) continue;
        const remote = remoteItems.get(id);

        if (!remote || (local.updatedAt && remote.updatedAt && local.updatedAt > remote.updatedAt)) {
            await setDoc(doc(colRef, id), toFirestore(local), { merge: true });
        }
    }

    // 2. Remote -> Local
    for (const [id, remote] of remoteItems.entries()) {
        const local = localItems.find(i => i[idKey]?.toString() === id);

        if (!local || (remote.updatedAt && local.updatedAt && remote.updatedAt > local.updatedAt)) {
            if (remote.deletedAt) {
                if (local) await localTable.delete(local[idKey]);
            } else {
                await localTable.put(remote);
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
        await syncTable<any>(userId, 'settings', db.settings, 'key');

        const now = new Date();
        await db.settings.put({ key: 'lastSync', value: now.toISOString(), updatedAt: now });
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
