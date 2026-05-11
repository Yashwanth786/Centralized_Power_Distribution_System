// src/firebase/config.js
// ============================================================
//  STEP 1: Replace these values with YOUR Firebase project config
//  Go to: Firebase Console → Project Settings → Your Apps → Web App
// ============================================================

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "iith-ee-lab.firebaseapp.com",
  databaseURL: "https://iith-ee-lab-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iith-ee-lab",
  storageBucket: "iith-ee-lab.firebasestorage.app",
  messagingSenderId: "828475220038",
  appId: "1:828475220038:web:b111457860d2e43711ea47",
  measurementId: "G-KTC8GM0PYP"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export default app;
