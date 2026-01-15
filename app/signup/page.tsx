"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState(""); // ✅ 追加
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSignup = async () => {
    setError("");

    const u = username.trim();

    if (!email || !password || !passwordConfirm || !u) {
      setError("メールアドレス・パスワード・確認用パスワード・ユーザー名をすべて入力してください。");
      return;
    }

    // ✅ 追加：パスワード一致チェック
    if (password !== passwordConfirm) {
      setError("パスワードと確認用パスワードが一致しません。");
      return;
    }

    if (!agreed) {
      setError("利用規約に同意してください。");
      return;
    }

    if (u.length > 20) {
      setError("ユーザー名は20文字以内にしてください。");
      return;
    }

    try {
      setLoading(true);

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", cred.user.uid), {
        username: u,
        bio: "",
        followerCount: 0,
        followingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateProfile(cred.user, {
        displayName: u,
      });

      try {
        await sendEmailVerification(cred.user, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        });
      } catch (e: any) {
        console.error("sendEmailVerification failed", e);
        setError("確認メールの送信に失敗しました：" + (e?.message ?? "不明なエラー"));
        return;
      }

      await signOut(auth);
      setDone(true);
    } catch (err: any) {
      console.error(err);
      setError("会員登録に失敗しました：" + (err?.message ?? "不明なエラー"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: 'url("/hero-night-road.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 12px",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          padding: 24,
          borderRadius: 16,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.7)",
          color: "white",
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>会員登録</h1>
        <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
          あらすじ街灯にアカウントを作成して、あらすじの投稿や「面白そう！」、コメントを楽しみましょう。
        </p>

        {/* ユーザー名 */}
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          ユーザー名
        </label>
        <input
          type="text"
          placeholder="例）ao_writer"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 10,
            fontSize: 13,
          }}
        />

        {/* メールアドレス */}
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          メールアドレス
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 10,
            fontSize: 13,
          }}
        />

        {/* パスワード */}
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          パスワード
        </label>
        <input
          type="password"
          placeholder="6文字以上のパスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 10,
            fontSize: 13,
          }}
        />

        {/* ✅ パスワード（確認） */}
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          パスワード（確認）
        </label>
        <input
          type="password"
          placeholder="もう一度入力してください"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 12,
            fontSize: 13,
          }}
        />

        {/* 利用規約 */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            <a href="terms" style={{ textDecoration: "underline", color: "#c5ddff" }}>
              利用規約
            </a>
            と
            <a href="privacy" style={{ textDecoration: "underline", color: "#c5ddff" }}>
              プライバシーポリシー
            </a>
            に同意します。
          </span>
        </label>

        {error && (
          <p style={{ color: "#ff7b7b", fontSize: 12, marginBottom: 8 }}>
            {error}
          </p>
        )}

        {done && (
          <p style={{ color: "#a5f3c7", fontSize: 12, marginBottom: 8 }}>
            会員登録が完了しました。確認メールを送信しましたので、メール内のリンクをクリックして認証してください。
            <br />
            ※迷惑メールフォルダもご確認ください。
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <button
            onClick={handleSignup}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 999,
              border: "none",
              background: loading ? "#4b5563" : "#4b84d8",
              color: "white",
              fontWeight: "bold",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "登録中..." : "登録する"}
          </button>

          <button
            onClick={handleBack}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.4)",
              background: "transparent",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            戻る
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: 10,
            display: "flex",
            justifyContent: "center",
            fontSize: 11,
            opacity: 0.85,
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <a href="terms" style={{ textDecoration: "underline", color: "#c5ddff" }}>
            利用規約
          </a>
          <a href="privacy" style={{ textDecoration: "underline", color: "#c5ddff" }}>
            プライバシーポリシー
          </a>
        </div>
      </div>
    </div>
  );
}
