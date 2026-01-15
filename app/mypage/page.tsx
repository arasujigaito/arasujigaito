"use client";

import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  getCountFromServer,
  collection,
  // ✅ collectionGroup / query / where は使わないので削除
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";

import MyPostsSection from "./components/MyPostsSection";
import type { MyPost } from "./components/MyPostsSection";

type Profile = {
  username: string;
  bio: string;
  followerCount: number;
  followingCount: number;
};

const EMPTY_PROFILE: Profile = {
  username: "（ユーザー名未設定）",
  bio: "（紹介文未設定）",
  followerCount: 0,
  followingCount: 0,
};

const pageBg: CSSProperties = {
  minHeight: "100vh",
  backgroundImage: 'url("/hero-night-road.jpg")',
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

export default function MyPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [uid, setUid] = useState<string>("");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // ----------------------------
  // ✅ 認証監視（状態セットだけ）
  // ----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUser(null);
        setUid("");
        router.push("/");
        return;
      }
      setUser(u);
      setUid(u.uid);
    });

    return () => unsub();
  }, [router]);

  // ----------------------------
  // ✅ データ取得（user が確定した時だけ）
  // ----------------------------
  useEffect(() => {
    if (!user) return;

    let alive = true;

    const run = async () => {
      setLoading(true);
      setErrorText(null);

      try {
        // ✅ users/{uid} は getDoc で取る
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const data = userSnap.exists() ? (userSnap.data() as any) : {};

        // ✅ followingCount = users/{me}/following の件数（本人なので権限OK）
        const followingSnap = await getCountFromServer(
          collection(db, "users", user.uid, "following")
        );

        const nextProfile: Profile = {
          username: data?.username ?? EMPTY_PROFILE.username,
          bio: data?.bio ?? EMPTY_PROFILE.bio,
          followingCount: followingSnap.data().count ?? 0,
          followerCount: typeof data?.followerCount === "number" ? data.followerCount : 0,
        };

        // --- 自分の投稿取得（createdAt desc）---
        const fetchMyPosts = async (withOrderBy: boolean) => {
          const { collection, getDocs, limit, orderBy, query, where } = await import(
            "firebase/firestore"
          );

          const base = [
            collection(db, "posts"),
            where("authorId", "==", user.uid),
            ...(withOrderBy ? [orderBy("createdAt", "desc")] : []),
            limit(50),
          ] as const;

          const q = query(...base);
          const ps = await getDocs(q);

          return ps.docs
            .map((d) => {
              const x = d.data() as any;

              const createdAtMs =
                typeof x.createdAt?.toMillis === "function"
                  ? x.createdAt.toMillis()
                  : typeof x.createdAtMs === "number"
                    ? x.createdAtMs
                    : typeof x.createdAt === "number"
                      ? x.createdAt
                      : 0;

              const likeCount =
                typeof x.likeCount === "number"
                  ? x.likeCount
                  : Array.isArray(x.likeUids)
                    ? x.likeUids.length
                    : 0;

              return {
                id: d.id,
                catchcopy: x.catchcopy ?? "",
                body: x.body ?? "",
                genre: x.genre ?? "その他",
                url: x.url ?? "",
                createdAtMs,
                likeCount,
              } satisfies MyPost;
            })
            .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
        };

        let mine: MyPost[] = [];
        try {
          mine = await fetchMyPosts(true);
        } catch (e) {
          console.error("posts query failed (with orderBy). fallback:", e);
          mine = await fetchMyPosts(false);
        }

        if (!alive) return;

        setProfile(nextProfile);
        setMyPosts(mine);
      } catch (e: any) {
        console.error("mypage load failed:", e);
        if (!alive) return;

        setErrorText(
          e?.message
            ? String(e.message)
            : "読み込みでエラーが発生しました（Firestoreの設定/権限/インデックスを確認）"
        );
        setProfile(EMPTY_PROFILE);
        setMyPosts([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user]);

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
          <div style={{ fontWeight: 800, marginBottom: 8 }}>マイページでエラー</div>
          <div style={{ opacity: 0.9, whiteSpace: "pre-wrap" }}>{errorText}</div>
          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
            ※ ブラウザの開発者ツール（Console）も見てください
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={pageBg}>
        <div style={{ color: "white", padding: 20, maxWidth: 960, margin: "0 auto" }}>
          プロフィールが取得できませんでした
        </div>
      </div>
    );
  }

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px", color: "white" }}>
        {/* プロフィール */}
        <Card>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{profile.username}</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>{profile.bio}</div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <GhostButton onClick={() => router.push("/")}>← トップページへ</GhostButton>
            <PrimaryButton onClick={() => router.push("/mypage/edit")}>
              プロフィール編集
            </PrimaryButton>
          </div>

          {uid && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
              uid: <span style={{ fontFamily: "monospace" }}>{uid}</span>
            </div>
          )}
        </Card>

        {/* 数字カード（✅ タップで一覧へ） */}
        <Card>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StatButton
              label="フォロー"
              value={profile.followingCount}
              onClick={() => uid && router.push(`/u/${uid}/following`)}
              disabled={!uid}
            />
            <StatButton
              label="フォロワー"
              value={profile.followerCount}
              onClick={() => uid && router.push(`/u/${uid}/followers`)}
              disabled={!uid}
            />
          </div>
        </Card>

        {/* ✅ 投稿欄は MyPostsSection に寄せる */}
        <MyPostsSection uid={uid} posts={myPosts} />
      </div>
    </div>
  );
}

/* ---------- UIパーツ ---------- */

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        // ✅ ここだけ変更：投稿欄と同じ“濃さ”に寄せる（白→黒の半透明へ）
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        background: "#4b84d8",
        border: "none",
        color: "white",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
      {children}
    </button>
  );
}

/** ✅ 追加：Stat をタップ可能にしただけ（見た目はほぼ同じ） */
function StatButton({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: 0,
        color: "white",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </button>
  );
}

/* （元のStatは他で使っていないなら残してもOKだけど、必要最小にするため今回は追加のみ） */
