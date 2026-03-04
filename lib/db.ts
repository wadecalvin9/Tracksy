import Dexie, { type Table } from 'dexie';

export interface Account {
    id?: string;
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'cash';
    balance: number;
    currency: string;
    color: string;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface Category {
    id?: string;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    budget?: number; // monthly budget limit
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface Transaction {
    id?: string;
    accountId: string;
    categoryId: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    description: string;
    date: Date;
    toAccountId?: string; // for transfers
    tags?: string[];
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface Budget {
    id?: string;
    categoryId: string;
    amount: number;
    period: 'monthly' | 'weekly' | 'yearly';
    startDate: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface Setting {
    key: string;
    value: any;
    updatedAt?: Date;
}

export class TracksyDB extends Dexie {
    accounts!: Table<Account>;
    categories!: Table<Category>;
    transactions!: Table<Transaction>;
    budgets!: Table<Budget>;
    settings!: Table<Setting>;

    constructor() {
        super('TracksyDB');
        this.version(4).stores({
            accounts: 'id, name, type, updatedAt, deletedAt',
            categories: 'id, name, type, updatedAt, deletedAt',
            transactions: 'id, accountId, categoryId, type, date, updatedAt, deletedAt',
            budgets: 'id, categoryId, period, updatedAt, deletedAt',
            settings: 'key',
        });
    }
}

// UUID generator for client-side IDs
export function generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Lazily initialize so it only runs in the browser (never during SSR)
let _db: TracksyDB | null = null;
export function getDb(): TracksyDB {
    if (!_db) _db = new TracksyDB();
    return _db;
}

// Convenience alias — safe to call only from client components / useEffect
export const db = typeof window !== 'undefined' ? new TracksyDB() : (null as unknown as TracksyDB);

// Currency Helpers
export const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
];

export async function getCurrency() {
    const s = await db.settings.get('currency');
    return s?.value || 'USD';
}

export async function setCurrency(code: string) {
    await db.settings.put({ key: 'currency', value: code, updatedAt: new Date() });
}

export async function getUserName() {
    const s = await db.settings.get('userName');
    return s?.value || 'User';
}

export async function setUserName(name: string) {
    await db.settings.put({ key: 'userName', value: name, updatedAt: new Date() });
}

// Ensure data is persistent (won't be cleared by browser)
export async function requestPersistence() {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
        try {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                await navigator.storage.persist();
            }
        } catch (e) {
            console.warn('Storage persistence request failed', e);
        }
    }
}

export async function getStorageInfo() {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const persisted = await navigator.storage.persisted();
        return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
            persisted
        };
    }
    return null;
}

// Seed basic infrastructure (categories) if empty
export async function seedInfrastructure() {
    const catCount = await db.categories.count();
    if (catCount > 0) return;

    await db.categories.bulkAdd([
        { id: 'cat_income_1', name: 'Salary', icon: '💼', color: '#10b981', type: 'income', updatedAt: new Date() },
        { id: 'cat_income_2', name: 'Freelance', icon: '💻', color: '#6366f1', type: 'income', updatedAt: new Date() },
        { id: 'cat_income_3', name: 'Investments', icon: '📈', color: '#8b5cf6', type: 'income', updatedAt: new Date() },
        { id: 'cat_expense_1', name: 'Food & Dining', icon: '🍔', color: '#f59e0b', type: 'expense', budget: 600, updatedAt: new Date() },
        { id: 'cat_expense_2', name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense', budget: 300, updatedAt: new Date() },
        { id: 'cat_expense_3', name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense', budget: 500, updatedAt: new Date() },
        { id: 'cat_expense_4', name: 'Housing', icon: '🏠', color: '#14b8a6', type: 'expense', budget: 1500, updatedAt: new Date() },
        { id: 'cat_expense_5', name: 'Health', icon: '❤️', color: '#ef4444', type: 'expense', budget: 200, updatedAt: new Date() },
        { id: 'cat_expense_6', name: 'Entertainment', icon: '🎬', color: '#a855f7', type: 'expense', budget: 250, updatedAt: new Date() },
        { id: 'cat_expense_7', name: 'Utilities', icon: '⚡', color: '#f97316', type: 'expense', budget: 200, updatedAt: new Date() },
    ]);
}

// Seed default data if empty (Demo mode)
export async function seedDefaultData() {
    const accountCount = await db.accounts.count();
    if (accountCount > 0) return;

    // Infrastructure first
    await seedInfrastructure();

    // Default accounts
    await db.accounts.bulkAdd([
        { id: 'acc_1', name: 'Main Checking', type: 'checking', balance: 4280.50, currency: 'USD', color: '#6366f1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'acc_2', name: 'Savings', type: 'savings', balance: 12500.00, currency: 'USD', color: '#10b981', createdAt: new Date(), updatedAt: new Date() },
        { id: 'acc_3', name: 'Credit Card', type: 'credit', balance: -1340.20, currency: 'USD', color: '#f59e0b', createdAt: new Date(), updatedAt: new Date() },
    ]);

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const rnd = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
    const day = (d: number) => new Date(year, month, d);

    // Seed transactions
    await db.transactions.bulkAdd([
        { id: 'tx_1', accountId: 'acc_1', categoryId: 'cat_income_1', amount: 5200, type: 'income', description: 'Monthly salary', date: day(1), createdAt: day(1), updatedAt: day(1) },
        { id: 'tx_2', accountId: 'acc_1', categoryId: 'cat_income_2', amount: 850, type: 'income', description: 'Freelance project', date: day(5), createdAt: day(5), updatedAt: day(5) },
        { id: 'tx_3', accountId: 'acc_1', categoryId: 'cat_expense_4', amount: 1500, type: 'expense', description: 'Rent payment', date: day(2), createdAt: day(2), updatedAt: day(2) },
        { id: 'tx_4', accountId: 'acc_1', categoryId: 'cat_expense_1', amount: rnd(40, 120), type: 'expense', description: 'Grocery shopping', date: day(3), createdAt: day(3), updatedAt: day(3) },
        { id: 'tx_5', accountId: 'acc_1', categoryId: 'cat_expense_2', amount: rnd(30, 80), type: 'expense', description: 'Gas station', date: day(4), createdAt: day(4), updatedAt: day(4) },
        { id: 'tx_6', accountId: 'acc_3', categoryId: 'cat_expense_3', amount: rnd(50, 200), type: 'expense', description: 'Amazon purchase', date: day(6), createdAt: day(6), updatedAt: day(6) },
        { id: 'tx_7', accountId: 'acc_1', categoryId: 'cat_expense_5', amount: rnd(20, 80), type: 'expense', description: 'Pharmacy', date: day(7), createdAt: day(7), updatedAt: day(7) },
        { id: 'tx_8', accountId: 'acc_1', categoryId: 'cat_expense_6', amount: rnd(10, 60), type: 'expense', description: 'Netflix & Spotify', date: day(8), createdAt: day(8), updatedAt: day(8) },
        { id: 'tx_9', accountId: 'acc_1', categoryId: 'cat_expense_1', amount: rnd(20, 80), type: 'expense', description: 'Restaurant dinner', date: day(10), createdAt: day(10), updatedAt: day(10) },
        { id: 'tx_10', accountId: 'acc_1', categoryId: 'cat_expense_7', amount: rnd(80, 150), type: 'expense', description: 'Electricity bill', date: day(11), createdAt: day(11), updatedAt: day(11) },
        { id: 'tx_11', accountId: 'acc_3', categoryId: 'cat_expense_3', amount: rnd(30, 100), type: 'expense', description: 'Clothing store', date: day(13), createdAt: day(13), updatedAt: day(13) },
        { id: 'tx_12', accountId: 'acc_1', categoryId: 'cat_expense_2', amount: rnd(20, 60), type: 'expense', description: 'Uber rides', date: day(15), createdAt: day(15), updatedAt: day(15) },
        { id: 'tx_13', accountId: 'acc_1', categoryId: 'cat_income_3', amount: rnd(200, 600), type: 'income', description: 'Dividend income', date: day(16), createdAt: day(16), updatedAt: day(16) },
        { id: 'tx_14', accountId: 'acc_1', categoryId: 'cat_expense_1', amount: rnd(50, 120), type: 'expense', description: 'Supermarket', date: day(18), createdAt: day(18), updatedAt: day(18) },
        { id: 'tx_15', accountId: 'acc_3', categoryId: 'cat_expense_6', amount: rnd(20, 80), type: 'expense', description: 'Movie tickets', date: day(20), createdAt: day(20), updatedAt: day(20) },
    ]);

    // Seed budgets
    await db.budgets.bulkAdd([
        { id: 'bud_1', categoryId: 'cat_expense_1', amount: 600, period: 'monthly', startDate: new Date(year, month, 1), updatedAt: new Date() },
        { id: 'bud_2', categoryId: 'cat_expense_2', amount: 300, period: 'monthly', startDate: new Date(year, month, 1), updatedAt: new Date() },
        { id: 'bud_3', categoryId: 'cat_expense_3', amount: 500, period: 'monthly', startDate: new Date(year, month, 1), updatedAt: new Date() },
        { id: 'bud_4', categoryId: 'cat_expense_4', amount: 1500, period: 'monthly', startDate: new Date(year, month, 1), updatedAt: new Date() },
        { id: 'bud_5', categoryId: 'cat_expense_5', amount: 200, period: 'monthly', startDate: new Date(year, month, 1), updatedAt: new Date() },
        { id: 'bud_6', categoryId: 'cat_expense_6', amount: 250, period: 'monthly', startDate: new Date(year, month, 1), updatedAt: new Date() },
        { id: 'bud_7', categoryId: 'cat_expense_7', amount: 200, period: 'monthly', startDate: new Date(year, month, 1), updatedAt: new Date() },
    ]);
}
