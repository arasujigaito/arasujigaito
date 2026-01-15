"use client";

import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut, // ✅ 追加（未認証なら即ログアウト）
  sendEmailVerification, // ✅ 追加（未認証なら再送する）
} from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(""); // ✅ 追加（案内文）
  const [loading, setLoading] = useState(false);

  // ✅ Signup から /login?verify=1 で来たときの案内表示
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("verify") === "1") {
        setInfo(
          "確認メールを送信しました。メール内リンクをクリックして認証後、ログインしてください。"
        );
      }
    } catch {}
  }, []);

  const handleLogin = async () => {
    setError("");
    setInfo("");

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setLoading(true);

      const cred = await signInWithEmailAndPassword(auth, email, password);

      // ✅ 未認証ならログインさせない
      if (!cred.user.emailVerified) {
        // ✅ ここだけ変更：再送の成否をユーザーに分かるようにする（握りつぶさない）
        try {
          await sendEmailVerification(cred.user, {
            url: `${window.location.origin}/login`,
            handleCodeInApp: false,
          });
          setInfo(
            "メール認証が未完了です。確認メールを再送しました。メール内リンクをクリックして認証後、もう一度ログインしてください。"
          );
        } catch (e: any) {
          console.error("sendEmailVerification failed", e);

          const code = e?.code ?? "";
          if (code === "auth/too-many-requests") {
            setError("送信回数が多すぎます。少し時間を置いて再度お試しください。");
          } else if (
            code === "auth/invalid-continue-uri" ||
            code === "auth/unauthorized-continue-uri"
          ) {
            setError(
              "確認メールの送信に失敗しました（URL/ドメイン設定の問題）。FirebaseのAuthorized domainsを確認してください。"
            );
          } else {
            setError("確認メールの送信に失敗しました：" + (e?.message ?? "不明なエラー"));
          }
        }

        await signOut(auth);
        return;
      }

      // 認証済み → トップへ
      window.location.href = "/";
    } catch (err: any) {
      setError("ログインに失敗しました：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
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
        color: "white",
      }}
    >
      {/* ✅ オーバーレイ削除（レイアウト共通に合わせる） */}

      {/* カード */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          padding: 24,
          borderRadius: 16,
          // ✅ 共通カード色に統一
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.6)",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>ログイン</h1>
        <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 18 }}>
          メールアドレスとパスワードでログインできます。
        </p>

        {/* ✅ 案内メッセージ */}
        {info && (
          <p style={{ color: "#a5f3c7", fontSize: 12, marginBottom: 10 }}>
            {info}
          </p>
        )}

        {/* メールアドレス */}
        <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
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
            marginBottom: 12,
            fontSize: 13,
          }}
        />

        {/* パスワード */}
        <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
          パスワード
        </label>
        <input
          type="password"
          placeholder="パスワードを入力"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            marginBottom: 16,
            fontSize: 13,
          }}
        />

        {/* エラーメッセージ */}
        {error && (
          <p
            style={{
              color: "#ff7b7b",
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            {error}
          </p>
        )}

        {/* ボタン */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleLogin}
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
            {loading ? "ログイン中..." : "ログイン"}
          </button>

          <button
            onClick={() => (window.location.href = "/signup")}
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
            アカウントを作成する
          </button>

          <button
            onClick={handleBack}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
