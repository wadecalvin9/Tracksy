import Dexie, { type Table } from 'dexie';

export interface Account {
    id?: number;
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'cash';
    balance: number;
    currency: string;
    color: string;
    createdAt: Date;
}

export interface Category {
    id?: number;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    budget?: number; // monthly budget limit
}

export interface Transaction {
    id?: number;
    accountId: number;
    categoryId: number;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    description: string;
    date: Date;
    toAccountId?: number; // for transfers
    tags?: string[];
    createdAt: Date;
}

export interface Budget {
    id?: number;
    categoryId: number;
    amount: number;
    period: 'monthly' | 'weekly' | 'yearly';
    startDate: Date;
}

export class TracksyDB extends Dexie {
    accounts!: Table<Account>;
    categories!: Table<Category>;
    transactions!: Table<Transaction>;
    budgets!: Table<Budget>;

    constructor() {
        super('TracksyDB');
        this.version(1).stores({
            accounts: '++id, name, type',
            categories: '++id, name, type',
            transactions: '++id, accountId, categoryId, type, date',
            budgets: '++id, categoryId, period',
        });
    }
}

// Lazily initialize so it only runs in the browser (never during SSR)
let _db: TracksyDB | null = null;
export function getDb(): TracksyDB {
    if (!_db) _db = new TracksyDB();
    return _db;
}

// Convenience alias — safe to call only from client components / useEffect
export const db = typeof window !== 'undefined' ? new TracksyDB() : (null as unknown as TracksyDB);

// Seed default data if empty
export async function seedDefaultData() {
    const accountCount = await db.accounts.count();
    if (accountCount > 0) return;

    // Default accounts
    await db.accounts.bulkAdd([
        { name: 'Main Checking', type: 'checking', balance: 4280.50, currency: 'USD', color: '#6366f1', createdAt: new Date() },
        { name: 'Savings', type: 'savings', balance: 12500.00, currency: 'USD', color: '#10b981', createdAt: new Date() },
        { name: 'Credit Card', type: 'credit', balance: -1340.20, currency: 'USD', color: '#f59e0b', createdAt: new Date() },
    ]);

    // Default categories
    const catIds = await db.categories.bulkAdd([
        { name: 'Salary', icon: '💼', color: '#10b981', type: 'income' },
        { name: 'Freelance', icon: '💻', color: '#6366f1', type: 'income' },
        { name: 'Investments', icon: '📈', color: '#8b5cf6', type: 'income' },
        { name: 'Food & Dining', icon: '🍔', color: '#f59e0b', type: 'expense', budget: 600 },
        { name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense', budget: 300 },
        { name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense', budget: 500 },
        { name: 'Housing', icon: '🏠', color: '#14b8a6', type: 'expense', budget: 1500 },
        { name: 'Health', icon: '❤️', color: '#ef4444', type: 'expense', budget: 200 },
        { name: 'Entertainment', icon: '🎬', color: '#a855f7', type: 'expense', budget: 250 },
        { name: 'Utilities', icon: '⚡', color: '#f97316', type: 'expense', budget: 200 },
    ], { allKeys: true });

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const rnd = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
    const day = (d: number) => new Date(year, month, d);

    // Seed transactions
    await db.transactions.bulkAdd([
        { accountId: 1, categoryId: 1, amount: 5200, type: 'income', description: 'Monthly salary', date: day(1), createdAt: day(1) },
        { accountId: 1, categoryId: 2, amount: 850, type: 'income', description: 'Freelance project', date: day(5), createdAt: day(5) },
        { accountId: 1, categoryId: 7, amount: 1500, type: 'expense', description: 'Rent payment', date: day(2), createdAt: day(2) },
        { accountId: 1, categoryId: 4, amount: rnd(40, 120), type: 'expense', description: 'Grocery shopping', date: day(3), createdAt: day(3) },
        { accountId: 1, categoryId: 5, amount: rnd(30, 80), type: 'expense', description: 'Gas station', date: day(4), createdAt: day(4) },
        { accountId: 3, categoryId: 6, amount: rnd(50, 200), type: 'expense', description: 'Amazon purchase', date: day(6), createdAt: day(6) },
        { accountId: 1, categoryId: 8, amount: rnd(20, 80), type: 'expense', description: 'Pharmacy', date: day(7), createdAt: day(7) },
        { accountId: 1, categoryId: 9, amount: rnd(10, 60), type: 'expense', description: 'Netflix & Spotify', date: day(8), createdAt: day(8) },
        { accountId: 1, categoryId: 4, amount: rnd(20, 80), type: 'expense', description: 'Restaurant dinner', date: day(10), createdAt: day(10) },
        { accountId: 1, categoryId: 10, amount: rnd(80, 150), type: 'expense', description: 'Electricity bill', date: day(11), createdAt: day(11) },
        { accountId: 3, categoryId: 6, amount: rnd(30, 100), type: 'expense', description: 'Clothing store', date: day(13), createdAt: day(13) },
        { accountId: 1, categoryId: 5, amount: rnd(20, 60), type: 'expense', description: 'Uber rides', date: day(15), createdAt: day(15) },
        { accountId: 1, categoryId: 3, amount: rnd(200, 600), type: 'income', description: 'Dividend income', date: day(16), createdAt: day(16) },
        { accountId: 1, categoryId: 4, amount: rnd(50, 120), type: 'expense', description: 'Supermarket', date: day(18), createdAt: day(18) },
        { accountId: 3, categoryId: 9, amount: rnd(20, 80), type: 'expense', description: 'Movie tickets', date: day(20), createdAt: day(20) },
    ]);

    // Seed budgets
    await db.budgets.bulkAdd([
        { categoryId: 4, amount: 600, period: 'monthly', startDate: new Date(year, month, 1) },
        { categoryId: 5, amount: 300, period: 'monthly', startDate: new Date(year, month, 1) },
        { categoryId: 6, amount: 500, period: 'monthly', startDate: new Date(year, month, 1) },
        { categoryId: 7, amount: 1500, period: 'monthly', startDate: new Date(year, month, 1) },
        { categoryId: 8, amount: 200, period: 'monthly', startDate: new Date(year, month, 1) },
        { categoryId: 9, amount: 250, period: 'monthly', startDate: new Date(year, month, 1) },
        { categoryId: 10, amount: 200, period: 'monthly', startDate: new Date(year, month, 1) },
    ]);
}
