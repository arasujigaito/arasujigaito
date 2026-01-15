"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../firebase";

// ✅ 修正点：背景は layout に任せる（透明）
const pageBg: CSSProperties = {
  minHeight: "100vh",
  background: "transparent",
};

type Row = { uid: string; username: string };

export default function FollowingPage() {
  const router = useRouter();
  const params = useParams<{ uid: string }>();
  const targetUid = String(params?.uid ?? "");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUid) return;

    let alive = true;

    const run = async () => {
      setLoading(true);
      setErrorText(null);

      try {
        // users/{targetUid}/following のドキュメントIDが「相手uid」前提
        const snap = await getDocs(collection(db, "users", targetUid, "following"));
        const uids = snap.docs.map((d) => d.id);

        const list: Row[] = [];
        for (const uid of uids) {
          const u = await getDoc(doc(db, "users", uid));
          const data = u.exists() ? (u.data() as any) : null;
          list.push({ uid, username: data?.username ?? "名無し" });
        }

        if (!alive) return;
        setRows(list);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setErrorText(e?.message ? String(e.message) : "読み込みに失敗しました");
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [targetUid]);

  if (loading) {
    return (
      <div style={pageBg}>
        <div style={{ color: "white", padding: 20, maxWidth: 960, margin: "0 auto" }}>
          読み込み中…
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div style={pageBg}>
        <div style={{ color: "white", padding: 20, maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>フォロー一覧でエラー</div>
          <div style={{ opacity: 0.9, whiteSpace: "pre-wrap" }}>{errorText}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px", color: "white" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>フォロー</div>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← 戻る
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ opacity: 0.8 }}>まだフォローしていません</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r) => (
              <button
                key={r.uid}
                type="button"
                onClick={() => router.push(`/u/${r.uid}`)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 14,
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                @{r.username}
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{r.uid}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
