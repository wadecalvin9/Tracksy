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

    apiKey: "AIzaSyBK1jb-TYhgP-beZrXUkDVmqxqRG5G39aU",

    authDomain: "tracksy-d4937.firebaseapp.com",

    projectId: "tracksy-d4937",

    storageBucket: "tracksy-d4937.firebasestorage.app",

    messagingSenderId: "725316154082",

    appId: "1:725316154082:web:e5742794cb109375c424bb"

};


// Prevent re-initialization during hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
