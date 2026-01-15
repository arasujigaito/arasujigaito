// app/notifications/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
  type DocumentData,
  documentId,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";

type NotifType = "follow" | "like" | "bookmark" | "comment" | "comment_like";

type Notif = {
  id: string;
  type: NotifType;
  fromUid: string;
  fromName?: string | null;
  postId?: string | null;
  commentId?: string | null;
  read: boolean;
  createdAt?: any;
};

function formatTime(createdAt: any) {
  try {
    const d = createdAt?.toDate?.() instanceof Date ? createdAt.toDate() : null;
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${day} ${hh}:${mm}`;
  } catch {
    return "";
  }
}

function chunk<T>(arr: T[], size: number) {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [items, setItems] = useState<Notif[]>([]);
  const [marking, setMarking] = useState(false);

  // ✅ 追加：fromUid -> username（fromName が無い通知を救済）
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    const q = query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const list: Notif[] = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          type: data.type,
          fromUid: data.fromUid,
          fromName: data.fromName ?? null,
          postId: data.postId ?? null,
          commentId: data.commentId ?? null,
          read: !!data.read,
          createdAt: data.createdAt,
        };
      });
      setItems(list);
    });

    return () => unsub();
  }, [user]);

  // ✅ 追加：fromName が空の通知があれば users から補完（「だれか」を減らす）
  useEffect(() => {
    const run = async () => {
      const missing = Array.from(
        new Set(
          items
            .filter((n) => !!n.fromUid && !(n.fromName && String(n.fromName).trim()))
            .map((n) => n.fromUid)
        )
      ).filter((uid) => !nameMap[uid]);

      if (missing.length === 0) return;

      try {
        const next: Record<string, string> = {};
        for (const g of chunk(missing, 10)) {
          const q = query(collection(db, "users"), where(documentId(), "in", g));
          const snap = await getDocs(q);
          snap.forEach((d) => {
            next[d.id] = (d.data() as any)?.username ?? "名無し";
          });
        }
        setNameMap((prev) => ({ ...prev, ...next }));
      } catch {
        // 失敗しても画面は出す
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        setMarking(true);
        const unreadQ = query(
          collection(db, "users", user.uid, "notifications"),
          where("read", "==", false)
        );
        const snap = await getDocs(unreadQ);
        if (snap.empty) return;

        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
        await batch.commit();
      } finally {
        setMarking(false);
      }
    })();
  }, [user]);

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  // ✅ 正しい投稿詳細パスは /p/[postId]
  const hrefOf = (n: Notif) => {
    const pid = (n.postId ?? "").trim();
    if (!pid) return null;

    const cid = (n.commentId ?? "").trim();

    // ✅ comment / comment_like は commentId があればコメントへ飛ぶ
    if ((n.type === "comment" || n.type === "comment_like") && cid) {
      return `/p/${pid}#comment-${cid}`;
    }

    return `/p/${pid}`;
  };

  // ✅ 追加：通知メッセージを「表示名」と「残り」に分解（名前だけリンク化するため）
  const partsOf = (n: Notif) => {
    // fromName優先、無ければ nameMap、どちらも無ければ「だれか」
    const name =
      n.fromName && String(n.fromName).trim()
        ? String(n.fromName)
        : nameMap[n.fromUid] ?? "だれか";

    switch (n.type) {
      case "follow":
        return { name, rest: "さんがあなたをフォローしました" };
      case "like":
        return { name, rest: "さんがあなたの投稿に「面白そう！」しました" };
      case "bookmark":
        return { name, rest: "さんがあなたの投稿をブックマークしました" };
      case "comment":
        return { name, rest: "さんがあなたの投稿にコメントしました" };
      case "comment_like":
        return { name, rest: "さんがあなたのコメントに「いいね」しました" };
      default:
        return { name, rest: "新しい通知があります" };
    }
  };

  if (loadingAuth) {
    return <div style={{ padding: 16 }}>確認中…</div>;
  }

  if (!user) {
    return <div style={{ padding: 16 }}>ログインが必要です。</div>;
  }

  return (
    <div style={{ maxWidth: 960, margin: "16px auto", padding: 16 }}>
      {/* ✅ 追加：トップへ戻るボタン */}
      <div style={{ marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            background: "white",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ← トップページへ
        </button>
      </div>

      {/* ✅ ここだけ変更：未読の数字だけ色を付ける */}
      <h1 style={{ fontSize: 18, color: "white" }}>
        通知（未読:{" "}
        <span style={{ color: "#4b84d8", fontWeight: 900 }}>{unreadCount}</span>
        ）{marking ? "（既読処理中…）" : ""}
      </h1>

      {items.length === 0 ? (
        <div style={{ opacity: 0.85, fontSize: 13 }}>まだ通知はありません。</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((n) => {
            const href = hrefOf(n);
            const clickable = !!href;
            const { name, rest } = partsOf(n);

            return (
              <div
                key={n.id}
                onClick={() => href && router.push(href)}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!href) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(href);
                  }
                }}
                style={{
                  padding: 12,
                  borderRadius: 14,

                  // ✅ 修正：他ページと同じ黒いカード背景に統一
                  background: "rgba(0,0,0,0.55)",

                  // ✅ 未読だけ少し目立たせたいので「枠」で差をつける（背景は統一のまま）
                  border: n.read
                    ? "1px solid rgba(255,255,255,0.12)"
                    : "1px solid rgba(75,132,216,0.35)",

                  cursor: href ? "pointer" : "default",
                }}
              >
                <div style={{ fontWeight: 700, color: "white" }}>
                  {/* ✅ 名前だけ押したら /u/[uid]（自分なら /mypage）へ。カード遷移と競合しないよう stopPropagation */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!n.fromUid) return;
                      if (n.fromUid === user.uid) router.push("/mypage");
                      else router.push(`/u/${n.fromUid}`);
                    }}
                    style={{
                      textDecoration: "underline",
                      cursor: n.fromUid ? "pointer" : "default",
                      color: "white",
                    }}
                    title="プロフィールを見る"
                  >
                    {name}
                  </span>
                  {rest}
                </div>

                <div style={{ fontSize: 12, opacity: 0.75, color: "white" }}>
                  {formatTime(n.createdAt)}
                </div>

                {!clickable && (
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6, color: "white" }}>
                    （この通知は投稿詳細に移動できません）
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
