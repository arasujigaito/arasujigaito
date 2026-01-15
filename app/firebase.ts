// app/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ----------------------------
// Firebase 設定（あなたのプロジェクトのもの）
// ----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD3U13F517PbMdqK2inV2bnqBdBkh0Q4X8",
  authDomain: "arasujisite.firebaseapp.com",
  projectId: "arasujisite",
  storageBucket: "arasujisite.firebasestorage.app",
  messagingSenderId: "243591472876",
  appId: "1:243591472876:web:f1fce3023e0f228809a7c9",
};

// ----------------------------
// 開発環境の Next.js では、
// ホットリロード時に Firebase が二重初期化しないように
// getApps() で確認してから initialize するのが重要。
// ----------------------------
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ----------------------------
// 認証と Firestore のエクスポート
// ----------------------------
export const auth = getAuth(app);
export const db = getFirestore(app);
