// lib/firebase.ts
// ─────────────────────────────────────────────
// IMPORTANT: Replace the placeholder values below with your actual
// Firebase project config from:
// Firebase Console → Your Project → Project Settings → General → Your apps → SDK setup and configuration
// ─────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


// Prevent re-initialization during hot reloads
const isConfigValid = !!firebaseConfig.apiKey;
const app = (getApps().length === 0 && isConfigValid)
    ? initializeApp(firebaseConfig)
    : getApps()[0];

// Only initialize services if app exists
export const auth = app ? getAuth(app) : null as any;
export const firestore = app ? getFirestore(app) : null as any;
export const googleProvider = new GoogleAuthProvider();
