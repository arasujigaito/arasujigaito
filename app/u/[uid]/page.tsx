"use client";

import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../firebase";

import { toggleFollow } from "../../lib/follow";

import MyPostsSection from "../../mypage/components/MyPostsSection";
import type { MyPost } from "../../mypage/components/MyPostsSection";

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

// ✅ 修正点：背景は layout に任せる（透明にする）
const pageBg: CSSProperties = {
  minHeight: "100vh",
  background: "transparent",
};

export default function UserPage() {
  const router = useRouter();
  const params = useParams<{ uid: string }>();
  const targetUid = String(params?.uid ?? "");

  const [me, setMe] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<MyPost[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // 認証監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMe(u ?? null));
    return () => unsub();
  }, []);

  // 自分なら mypage
  useEffect(() => {
    if (me?.uid && me.uid === targetUid) {
      router.replace("/mypage");
    }
  }, [me, targetUid, router]);

  // フォロー判定（初回表示用）
  useEffect(() => {
    const run = async () => {
      if (!me || me.uid === targetUid) {
        setFollowing(false);
        return;
      }
      try {
        const ref = doc(db, "users", me.uid, "following", targetUid);
        const snap = await getDoc(ref);
        setFollowing(snap.exists());
      } catch {
        setFollowing(false);
      }
    };
    run();
  }, [me, targetUid]);

  // プロフィール & 投稿取得
  useEffect(() => {
    if (!targetUid) return;

    let alive = true;
    setLoading(true);
    setErrorText(null);

    const run = async () => {
      try {
        const snap = await getDoc(doc(db, "users", targetUid));
        const data = snap.exists() ? snap.data() : null;

        const nextProfile: Profile = {
          username: data?.username ?? EMPTY_PROFILE.username,
          bio: data?.bio ?? EMPTY_PROFILE.bio,
          followerCount:
            typeof data?.followerCount === "number" ? data.followerCount : 0,
          followingCount:
            typeof data?.followingCount === "number" ? data.followingCount : 0,
        };

        const q = query(
          collection(db, "posts"),
          where("authorId", "==", targetUid),
          limit(50)
        );

        const ps = await getDocs(q);
        const list: MyPost[] = ps.docs.map((d) => {
          const x = d.data() as any;
          const createdAtMs =
            typeof x.createdAt?.toMillis === "function"
              ? x.createdAt.toMillis()
              : 0;

          return {
            id: d.id,
            catchcopy: x.catchcopy ?? "",
            body: x.body ?? "",
            genre: x.genre ?? "その他",
            url: x.url ?? "",
            createdAtMs,
            likeCount:
              typeof x.likeCount === "number"
                ? x.likeCount
                : Array.isArray(x.likeUids)
                  ? x.likeUids.length
                  : 0,
            bookmarkCount:
              typeof x.bookmarkCount === "number" ? x.bookmarkCount : 0,
          };
        });

        list.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));

        if (!alive) return;
        setProfile(nextProfile);
        setPosts(list);
      } catch {
        if (!alive) return;
        setErrorText("読み込みに失敗しました");
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

  // フォロー切替
  const onToggleFollow = async () => {
    if (!me || me.uid === targetUid || followBusy || !profile) return;

    const next = !following;

    setFollowBusy(true);
    try {
      await toggleFollow(me.uid, targetUid);
      setFollowing(next);
      setProfile({
        ...profile,
        followerCount: profile.followerCount + (next ? 1 : -1),
      });
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={pageBg}>
        <div style={{ color: "white", padding: 20 }}>読み込み中…</div>
      </div>
    );
  }

  if (errorText || !profile) {
    return (
      <div style={pageBg}>
        <div style={{ color: "white", padding: 20 }}>{errorText}</div>
      </div>
    );
  }

  const showFollowBtn = !!me && me.uid !== targetUid;

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, color: "white" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{profile.username}</div>
            {showFollowBtn && (
              <button
                onClick={onToggleFollow}
                disabled={followBusy}
                style={followBtn(following)}
              >
                {following ? "フォロー中" : "フォローする"}
              </button>
            )}
          </div>

          <div style={{ marginTop: 6 }}>{profile.bio}</div>

          <div style={{ marginTop: 12 }}>
            <GhostButton onClick={() => router.push("/")}>← トップページへ</GhostButton>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", gap: 16 }}>
            <StatButton
              label="フォロー"
              value={profile.followingCount}
              onClick={() => router.push(`/u/${targetUid}/following`)}
            />
            <StatButton
              label="フォロワー"
              value={profile.followerCount}
              onClick={() => router.push(`/u/${targetUid}/followers`)}
            />
          </div>
        </Card>

        <MyPostsSection uid={targetUid} posts={posts} variant="public" />
      </div>
    </div>
  );
}

/* UIパーツ（元のまま） */

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
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

function StatButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: 0,
        color: "white",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </button>
  );
}

function followBtn(active: boolean): CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: active ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.25)",
    color: active ? "#111827" : "white",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}
