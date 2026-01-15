"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  increment,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  documentId,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

import PostList from "../../components/PostList";

export type MyPost = {
  id: string;
  catchcopy: string;
  body: string;
  genre?: string;
  url?: string;

  createdAtMs: number;
  likeCount: number;

  // ✅ 追加：親から渡ってくる可能性がある
  bookmarkCount?: number;
};

type Mode = "new" | "old" | "popular" | "liked" | "bookmarked";

type UiPost = {
  id: string;
  catchcopy: string;
  body: string;
  author: string;
  genre: string;
  url?: string;
  authorId?: string;

  createdAt?: any;

  likeCount?: number;
  liked?: boolean;
  bookmarked?: boolean;

  // ✅ ブックマーク数
  bookmarkCount?: number;

  // ✅ 並び替え用ms
  createdAtMs?: number;
};

function chunk<T>(arr: T[], size: number) {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function msToTimestampLike(ms: number) {
  const d = new Date(ms || 0);
  return {
    toDate: () => d,
    toMillis: () => ms || 0,
  };
}

export default function MyPostsSection({
  uid,
  posts,
  variant = "mine",
}: {
  uid: string;
  posts: MyPost[];
  variant?: "mine" | "public";
}) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("new");

  useEffect(() => {
    if (variant === "public" && (mode === "liked" || mode === "bookmarked")) {
      setMode("new");
    }
  }, [variant, mode]);

  // ✅ 自分が「面白そう」した投稿ID（見た目の切替用）
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // ✅ ブックマークID（見た目の切替用）
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  // ✅ 追加：通知の fromName 用（Firestoreのusers.usernameを優先）
  const [myName, setMyName] = useState<string | null>(null);

  // ✅ 追加：publicページ用：ページ主(uid)のusername（他垢ページで「@自分」になるのを防ぐ）
  const [pageUserName, setPageUserName] = useState<string | null>(null);

  // ✅ 追加：自分のusernameを取得してキャッシュ（表示名のズレ対策）
  useEffect(() => {
    const me = auth.currentUser;
    if (!me) {
      setMyName(null);
      return;
    }

    let alive = true;

    const run = async () => {
      try {
        const snap = await getDoc(doc(db, "users", me.uid));
        const data = snap.exists() ? (snap.data() as any) : null;
        const name =
          typeof data?.username === "string" && data.username.trim()
            ? data.username.trim()
            : null;

        if (!alive) return;
        setMyName(name);
      } catch (e) {
        console.error("自分のusername取得に失敗:", e);
        if (!alive) return;
        setMyName(null);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [uid]);

  // ✅ 追加：ページ主(uid)のusernameを取得（publicページ表示名用）
  useEffect(() => {
    if (!uid) {
      setPageUserName(null);
      return;
    }

    let alive = true;

    const run = async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.exists() ? (snap.data() as any) : null;
        const name =
          typeof data?.username === "string" && data.username.trim()
            ? data.username.trim()
            : null;

        if (!alive) return;
        setPageUserName(name);
      } catch (e) {
        console.error("ページ主のusername取得に失敗:", e);
        if (!alive) return;
        setPageUserName(null);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [uid]);

  // ----------------------------
  // ✅ likedIds を常に持っておく
  // ----------------------------
  useEffect(() => {
    const me = auth.currentUser;
    if (!me) {
      setLikedIds(new Set());
      return;
    }

    const run = async () => {
      try {
        const snap = await getDocs(collection(db, "users", me.uid, "likedPosts"));
        const s = new Set<string>();
        snap.forEach((d) => s.add(d.id));
        setLikedIds(s);
      } catch (e) {
        console.error("likedPosts の取得に失敗:", e);
        setLikedIds(new Set());
      }
    };

    run();
  }, [uid]);

  // ----------------------------
  // ✅ bookmarkIds を常に持っておく
  // ----------------------------
  useEffect(() => {
    const me = auth.currentUser;
    if (!me) {
      setBookmarkIds(new Set());
      return;
    }

    const run = async () => {
      try {
        const snap = await getDocs(collection(db, "users", me.uid, "bookmarks"));
        const s = new Set<string>();
        snap.forEach((d) => s.add(d.id));
        setBookmarkIds(s);
      } catch (e) {
        console.error("bookmarks の取得に失敗:", e);
        setBookmarkIds(new Set());
      }
    };

    run();
  }, [uid]);

  // ✅ props の posts から「初期の myUiPosts」を作る（publicのときはページ主のusernameを表示）
  const myUiPostsBase: UiPost[] = useMemo(() => {
    const authorLabel =
      variant === "mine"
        ? (myName ?? "自分")
        : (pageUserName ?? "名無し");

    return posts.map((p) => ({
      id: p.id,
      catchcopy: p.catchcopy ?? "",
      body: p.body ?? "",
      genre: p.genre ?? "その他",
      url: p.url ?? "",
      author: authorLabel, // ✅ 修正：publicで「自分」固定にならない
      authorId: uid,

      createdAt: msToTimestampLike(p.createdAtMs ?? 0),
      createdAtMs: p.createdAtMs ?? 0,

      likeCount: typeof p.likeCount === "number" ? p.likeCount : 0,
      liked: likedIds.has(p.id),
      bookmarked: bookmarkIds.has(p.id),

      bookmarkCount: typeof p.bookmarkCount === "number" ? p.bookmarkCount : 0,
    }));
  }, [posts, uid, likedIds, bookmarkIds, variant, myName, pageUserName]);

  // ✅ 重要：myUiPosts は state（likeCount / bookmarkCount をここで更新する）
  const [myUiPosts, setMyUiPosts] = useState<UiPost[]>([]);

  // ✅ posts が変わったときだけ “基礎データ” を反映
  useEffect(() => {
    setMyUiPosts(myUiPostsBase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, uid, variant, myName, pageUserName]);

  // ✅ 追加：自分の投稿の bookmarkCount を posts コレクションから補完して 0戻りを防ぐ
  useEffect(() => {
    if (!posts?.length) return;

    let alive = true;

    const run = async () => {
      try {
        const ids = posts.map((p) => p.id).filter(Boolean);
        const map = new Map<string, number>();

        for (const g of chunk(ids, 10)) {
          const q = query(collection(db, "posts"), where(documentId(), "in", g));
          const snap = await getDocs(q);
          snap.docs.forEach((d) => {
            const x = d.data() as any;
            map.set(d.id, typeof x.bookmarkCount === "number" ? x.bookmarkCount : 0);
          });
        }

        if (!alive) return;

        setMyUiPosts((prev) =>
          prev.map((p) => {
            const bc = map.get(p.id);
            if (typeof bc !== "number") return p;
            if ((p.bookmarkCount ?? 0) === bc) return p;
            return { ...p, bookmarkCount: bc };
          })
        );
      } catch (e) {
        console.error("bookmarkCount の補完取得に失敗:", e);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [posts]);

  // ✅ likedIds / bookmarkIds は「見た目だけ」同期（countは保持）
  useEffect(() => {
    setMyUiPosts((prev) =>
      prev.map((p) => ({
        ...p,
        liked: likedIds.has(p.id),
        bookmarked: bookmarkIds.has(p.id),
      }))
    );
  }, [likedIds, bookmarkIds]);

  const [likedPosts, setLikedPosts] = useState<UiPost[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likedError, setLikedError] = useState<string | null>(null);

  const [bookmarkedPosts, setBookmarkedPosts] = useState<UiPost[]>([]);
  const [bookmarkedLoading, setBookmarkedLoading] = useState(false);
  const [bookmarkedError, setBookmarkedError] = useState<string | null>(null);

  // ----------------------------
  // ✅ 追加：uid -> 最新username をまとめて取る（liked/bookmarkedの古い表示名対策）
  // ----------------------------
  const fetchUsernamesByUids = async (uids: string[]) => {
    const uniq = Array.from(new Set(uids)).filter(Boolean);
    const map = new Map<string, string>();

    for (const g of chunk(uniq, 10)) {
      const q = query(collection(db, "users"), where(documentId(), "in", g));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const x = d.data() as any;
        const name =
          typeof x?.username === "string" && x.username.trim() ? x.username.trim() : "";
        if (name) map.set(d.id, name);
      });
    }

    return map;
  };

  // ----------------------------
  // ✅ posts を ids でまとめて取得（順序は ids の順を維持）
  // ✅ authorName(投稿ドキュメント)より users.username(最新)を優先
  // ----------------------------
  const fetchPostsByIdsPreserveOrder = async (ids: string[]) => {
    const uniq = Array.from(new Set(ids)).filter(Boolean);
    if (uniq.length === 0) return [] as UiPost[];

    const map = new Map<string, UiPost>();
    const me = auth.currentUser?.uid ?? "";

    // ① posts を取る
    for (const g of chunk(uniq, 10)) {
      const q = query(collection(db, "posts"), where(documentId(), "in", g));
      const snap = await getDocs(q);

      snap.docs.forEach((d) => {
        const x = d.data() as any;
        const likeUids: string[] = Array.isArray(x.likeUids) ? x.likeUids : [];

        map.set(d.id, {
          id: d.id,
          catchcopy: x.catchcopy ?? "",
          body: x.body ?? "",
          genre: x.genre ?? "その他",
          url: x.url ?? "",
          author: x.authorName ?? "名無し", // ✅ 一旦入れる（後で上書きする）
          authorId: x.authorId ?? "",
          createdAt: x.createdAt ?? null,

          createdAtMs:
            typeof x.createdAt?.toMillis === "function" ? x.createdAt.toMillis() : 0,

          likeCount: typeof x.likeCount === "number" ? x.likeCount : likeUids.length,
          liked: me ? likeUids.includes(me) : false,
          bookmarked: bookmarkIds.has(d.id),

          bookmarkCount: typeof x.bookmarkCount === "number" ? x.bookmarkCount : 0,
        });
      });
    }

    // ② authorId を集めて users.username を取る（最新名で上書き）
    const authorIds = Array.from(map.values())
      .map((p) => String(p.authorId ?? ""))
      .filter(Boolean);

    const nameMap = await fetchUsernamesByUids(authorIds);

    // ③ 返すときに author を最新に寄せる
    return ids
      .map((id) => {
        const p = map.get(id);
        if (!p) return null;
        const aid = String(p.authorId ?? "");
        const latest = aid ? nameMap.get(aid) : undefined;
        return latest ? { ...p, author: latest } : p;
      })
      .filter(Boolean) as UiPost[];
  };

  // ----------------------------
  // ★ 面白そう（mode=liked のときだけ）※ mine のときだけ
  // ----------------------------
  useEffect(() => {
    if (variant === "public") return;
    if (mode !== "liked") return;
    const me = auth.currentUser?.uid;
    if (!me) return;

    let alive = true;

    const run = async () => {
      setLikedLoading(true);
      setLikedError(null);

      try {
        const q = query(collection(db, "users", me, "likedPosts"), orderBy("likedAt", "desc"));
        const snap = await getDocs(q);
        const ids = snap.docs.map((d) => (d.data() as any)?.postId ?? d.id);

        const list = await fetchPostsByIdsPreserveOrder(ids);

        if (!alive) return;
        setLikedPosts(list);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setLikedError(e?.message ? String(e.message) : "面白そう投稿の取得に失敗しました");
        setLikedPosts([]);
      } finally {
        if (!alive) return;
        setLikedLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [mode, variant, bookmarkIds]);

  // ----------------------------
  // ✅ ブックマーク（mode=bookmarked のときだけ）※ mine のときだけ
  // ----------------------------
  useEffect(() => {
    if (variant === "public") return;
    if (mode !== "bookmarked") return;
    const me = auth.currentUser?.uid;
    if (!me) return;

    let alive = true;

    const run = async () => {
      setBookmarkedLoading(true);
      setBookmarkedError(null);

      try {
        const q = query(collection(db, "users", me, "bookmarks"), orderBy("bookmarkedAt", "desc"));
        const snap = await getDocs(q);
        const ids = snap.docs.map((d) => (d.data() as any)?.postId ?? d.id);

        const list = await fetchPostsByIdsPreserveOrder(ids);

        if (!alive) return;
        setBookmarkedPosts(list);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setBookmarkedError(e?.message ? String(e.message) : "ブックマーク投稿の取得に失敗しました");
        setBookmarkedPosts([]);
      } finally {
        if (!alive) return;
        setBookmarkedLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [mode, variant, bookmarkIds]);

  // ----------------------------
  // 自分の投稿：並び替え（new/old/popular）
  // ----------------------------
  const sortedMyPosts = useMemo(() => {
    const arr = [...myUiPosts];

    const t = (p: UiPost) =>
      typeof p.createdAtMs === "number" ? p.createdAtMs : (p.createdAt?.toMillis?.() ?? 0);

    if (mode === "new") arr.sort((a, b) => t(b) - t(a));
    if (mode === "old") arr.sort((a, b) => t(a) - t(b));
    if (mode === "popular") arr.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));

    return arr;
  }, [myUiPosts, mode]);

  const displayPosts: UiPost[] =
    mode === "liked" ? likedPosts : mode === "bookmarked" ? bookmarkedPosts : sortedMyPosts;

  // ----------------------------
  // ✅ 面白そう：通知の fromName を Firestore username 優先にする
  // ----------------------------
  const handleLike = async (postId: string | number) => {
    const u = auth.currentUser;
    if (!u) {
      alert("ログインしてください");
      return;
    }

    const id = String(postId);

    const post =
      displayPosts.find((p) => p.id === id) ||
      myUiPosts.find((p) => p.id === id) ||
      likedPosts.find((p) => p.id === id) ||
      bookmarkedPosts.find((p) => p.id === id);

    if (!post) return;

    const alreadyLiked = !!post.liked;

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, "posts", id), {
        likeCount: increment(alreadyLiked ? -1 : 1),
        likeUids: alreadyLiked ? arrayRemove(u.uid) : arrayUnion(u.uid),
      });

      const likedRef = doc(db, "users", u.uid, "likedPosts", id);
      if (alreadyLiked) {
        batch.delete(likedRef);
      } else {
        batch.set(likedRef, {
          postId: id,
          likedAt: serverTimestamp(),
          catchcopy: post.catchcopy ?? "",
          body: post.body ?? "",
          author: post.author ?? "名無し",
          authorId: post.authorId ?? "",
          genre: post.genre ?? "その他",
          url: post.url ?? "",
          likeCountSnapshot: (post.likeCount ?? 0) + 1,
        });

        const toUid = String(post.authorId ?? "");
        if (toUid && toUid !== u.uid) {
          const notifRef = doc(collection(db, "users", toUid, "notifications"));
          batch.set(notifRef, {
            type: "like",
            fromUid: u.uid,
            fromName: myName ?? u.displayName ?? null,
            postId: id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (alreadyLiked) next.delete(id);
        else next.add(id);
        return next;
      });

      setMyUiPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked: !alreadyLiked,
                likeCount: Math.max(0, (p.likeCount ?? 0) + (alreadyLiked ? -1 : 1)),
              }
            : p
        )
      );

      if (variant === "mine") {
        const apply = (prev: UiPost[]) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  liked: !alreadyLiked,
                  likeCount: Math.max(0, (p.likeCount ?? 0) + (alreadyLiked ? -1 : 1)),
                }
              : p
          );

        setLikedPosts((prev) => {
          if (alreadyLiked) return prev.filter((p) => p.id !== id);
          const exists = prev.some((p) => p.id === id);
          if (exists) return apply(prev);
          return [{ ...post, liked: true, likeCount: (post.likeCount ?? 0) + 1 }, ...prev];
        });

        setBookmarkedPosts((prev) => apply(prev));
      }
    } catch (e) {
      console.error("like update failed:", e);
      alert("面白そう！の更新に失敗しました（権限/ルール/インデックスを確認）");
    }
  };

  // ----------------------------
  // ✅ ブックマーク：通知の fromName を Firestore username 優先にする
  // ----------------------------
  const handleBookmark = async (postId: string | number) => {
    const u = auth.currentUser;
    if (!u) {
      alert("ログインしてください");
      return;
    }

    const id = String(postId);

    const post =
      displayPosts.find((p) => p.id === id) ||
      myUiPosts.find((p) => p.id === id) ||
      likedPosts.find((p) => p.id === id) ||
      bookmarkedPosts.find((p) => p.id === id);

    if (!post) return;

    const alreadyBookmarked = !!post.bookmarked;

    try {
      const batch = writeBatch(db);
      const ref = doc(db, "users", u.uid, "bookmarks", id);

      if (alreadyBookmarked) {
        batch.delete(ref);
      } else {
        batch.set(ref, {
          postId: id,
          bookmarkedAt: serverTimestamp(),
          catchcopy: post.catchcopy ?? "",
          body: post.body ?? "",
          author: post.author ?? "名無し",
          authorId: post.authorId ?? "",
          genre: post.genre ?? "その他",
          url: post.url ?? "",
        });

        const toUid = String(post.authorId ?? "");
        if (toUid && toUid !== u.uid) {
          const notifRef = doc(collection(db, "users", toUid, "notifications"));
          batch.set(notifRef, {
            type: "bookmark",
            fromUid: u.uid,
            fromName: myName ?? u.displayName ?? null,
            postId: id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      batch.update(doc(db, "posts", id), {
        bookmarkCount: increment(alreadyBookmarked ? -1 : 1),
      });

      await batch.commit();

      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (alreadyBookmarked) next.delete(id);
        else next.add(id);
        return next;
      });

      const delta = alreadyBookmarked ? -1 : 1;
      const applyCount = (p: UiPost) => ({
        ...p,
        bookmarked: !alreadyBookmarked,
        bookmarkCount: Math.max(0, (p.bookmarkCount ?? 0) + delta),
      });

      setMyUiPosts((prev) => prev.map((p) => (p.id === id ? applyCount(p) : p)));

      if (variant === "mine") {
        setBookmarkedPosts((prev) => {
          if (alreadyBookmarked) return prev.filter((p) => p.id !== id);
          const exists = prev.some((p) => p.id === id);
          if (exists) return prev.map((p) => (p.id === id ? applyCount(p) : p));
          return [{ ...post, ...applyCount(post) }, ...prev];
        });

        setLikedPosts((prev) => prev.map((p) => (p.id === id ? applyCount(p) : p)));
      }
    } catch (e) {
      console.error("bookmark update failed:", e);
      alert("ブックマークの更新に失敗しました（権限/ルールを確認）");
    }
  };

  // ✅ コメント/返信は投稿詳細へ
  const handleComment = (postId: string | number) => {
    const id = String(postId);
    router.push(`/posts/${id}`);
  };

  const handleDelete = async (postId: string | number) => {
    const u = auth.currentUser;
    if (!u) {
      alert("ログインしてください");
      return;
    }

    if (variant === "public") return;

    const id = String(postId);
    if (!uid || u.uid !== uid) {
      alert("自分の投稿のみ削除できます");
      return;
    }

    try {
      const cSnap = await getDocs(collection(db, "posts", id, "comments"));
      const docs = cSnap.docs;

      for (let i = 0; i < docs.length; i += 450) {
        const batch = writeBatch(db);
        docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await deleteDoc(doc(db, "posts", id));

      setLikedPosts((prev) => prev.filter((p) => p.id !== id));
      setBookmarkedPosts((prev) => prev.filter((p) => p.id !== id));
      setMyUiPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("delete failed:", e);
      alert("削除に失敗しました（権限/ルールを確認）");
    }
  };

  const showDelete = variant === "mine" && (mode === "new" || mode === "old" || mode === "popular");

  return (
    <section>
      <div style={tabsWrap}>
        <TabButton active={mode === "new"} onClick={() => setMode("new")}>
          新着順
        </TabButton>
        <TabButton active={mode === "old"} onClick={() => setMode("old")}>
          古い順
        </TabButton>
        <TabButton active={mode === "popular"} onClick={() => setMode("popular")}>
          人気順
        </TabButton>

        {variant === "mine" && (
          <>
            <TabButton active={mode === "liked"} onClick={() => setMode("liked")}>
              面白そう！
            </TabButton>
            <TabButton active={mode === "bookmarked"} onClick={() => setMode("bookmarked")}>
              ブックマーク
            </TabButton>
          </>
        )}
      </div>

      {variant === "mine" && mode === "liked" && likedLoading && (
        <div style={{ opacity: 0.8, marginTop: 10 }}>面白そうした投稿を読み込み中…</div>
      )}
      {variant === "mine" && mode === "liked" && likedError && (
        <div style={{ color: "#ff9c9c", marginTop: 10, whiteSpace: "pre-wrap" }}>{likedError}</div>
      )}

      {variant === "mine" && mode === "bookmarked" && bookmarkedLoading && (
        <div style={{ opacity: 0.8, marginTop: 10 }}>ブックマークした投稿を読み込み中…</div>
      )}
      {variant === "mine" && mode === "bookmarked" && bookmarkedError && (
        <div style={{ color: "#ff9c9c", marginTop: 10, whiteSpace: "pre-wrap" }}>
          {bookmarkedError}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {displayPosts.length === 0 ? (
          <div style={{ opacity: 0.75 }}>まだ投稿がありません</div>
        ) : (
          <PostList
            posts={displayPosts as any}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onComment={handleComment}
            onDelete={showDelete ? (handleDelete as any) : (undefined as any)}
          />
        )}
      </div>
    </section>
  );
}

/* ---------- UI ---------- */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: active ? "1px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.22)",
        background: active
          ? "linear-gradient(135deg, rgba(120,213,180,0.35), rgba(81,148,214,0.4))"
          : "rgba(15,23,42,0.55)",
        color: "white",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const tabsWrap: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};
