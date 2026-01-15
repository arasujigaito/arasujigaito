// app/mypage/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase";

type Profile = {
  username?: string;
  bio?: string;
};

export default function MyPageEdit() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setErrorText(null);
      setSuccessText(null);

      if (!user) {
        router.push("/");
        return;
      }

      setUid(user.uid);
      setLoading(true);

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        const data = (snap.exists() ? (snap.data() as Profile) : {}) as Profile;

        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
      } catch (e: any) {
        console.error("mypage/edit load failed:", e);
        setErrorText(e?.message ? String(e.message) : "プロフィールの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const onSave = async () => {
    setErrorText(null);
    setSuccessText(null);

    if (!uid) return;

    const u = username.trim();
    const b = bio.trim();

    if (u.length === 0) {
      setErrorText("ユーザー名を入力してください");
      return;
    }
    if (u.length > 20) {
      setErrorText("ユーザー名は20文字以内にしてください");
      return;
    }
    if (b.length > 160) {
      setErrorText("自己紹介文は160文字以内にしてください");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        username: u,
        bio: b,
        updatedAt: serverTimestamp(),
      });

      setSuccessText("保存しました！");
      // すぐ反映を見たいならマイページへ戻す
      router.push("/mypage");
    } catch (e: any) {
      console.error("mypage/edit save failed:", e);
      setErrorText(
        e?.message
          ? String(e.message)
          : "保存に失敗しました（Firestoreの権限/ルールを確認）"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: "white", padding: 20 }}>読み込み中…</div>;
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px", color: "white" }}>
      <Card>
        <div style={{ fontSize: 20, fontWeight: 800 }}>プロフィール編集</div>

        {errorText && (
          <div style={{ marginTop: 10, color: "#fecaca", whiteSpace: "pre-wrap" }}>
            {errorText}
          </div>
        )}
        {successText && (
          <div style={{ marginTop: 10, color: "#bbf7d0", whiteSpace: "pre-wrap" }}>
            {successText}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <Label>ユーザー名</Label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名"
            style={inputStyle}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            20文字以内
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Label>自己紹介文</Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="自己紹介文"
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            160文字以内
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <PrimaryButton onClick={onSave} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </PrimaryButton>

          <GhostButton onClick={() => router.push("/mypage")} disabled={saving}>
            キャンセル
          </GhostButton>
        </div>
      </Card>
    </div>
  );
}

/* ---------- UI ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{children}</div>;
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        background: "#4b84d8",
        border: "none",
        color: "white",
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "white",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none",
};
