'use client';

import type { ToastMsg } from '@/app/page';

export default function Toast({ toasts }: { toasts: ToastMsg[] }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast ${t.type}`}>
                    <span>{t.type === 'success' ? '✅' : '❌'}</span>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
