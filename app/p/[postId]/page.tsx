// app/p/[postId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  documentId,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc, // ✅ 追加
  setDoc, // ✅ 追加
} from "firebase/firestore";
import { auth, db } from "../../firebase";

type UiPost = {
  id: string;

  // ✅ 追加：タイトル（任意）
  title?: string | null;

  catchcopy: string;
  body: string;
  author: string;
  genre: string;
  url?: string;
  authorId?: string;

  // ✅ 追加：タグ（任意）
  tags?: string[];

  createdAt?: any;
  likeCount?: number;

  // ✅ 追加：詳細ページで使う
  bookmarkCount?: number;
  liked?: boolean;
  bookmarked?: boolean;
};

type Comment = {
  id: string;
  body: string;
  authorId: string;
  parentId?: string | null;
  createdAt?: any;
  likeCount: number;
  likeUids: string[];
};

function chunk<T>(arr: T[], size: number) {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const postId = String(params?.postId ?? "");
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [post, setPost] = useState<UiPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
  const [myUsername, setMyUsername] = useState<string>("");

  // ✅ 追加：自分のブックマークIDセット（詳細ページ用）
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  // ----------------------------
  // Auth
  // ----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoadingAuth(false);

      if (!u) {
        setMyUsername("");
        setBookmarkIds(new Set());
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? (snap.data() as any) : null;
        setMyUsername(data?.username ?? "");
      } catch {
        setMyUsername("");
      }

      // ✅ 追加：自分の bookmarks を読み込む
      try {
        const snap = await getDocs(collection(db, "users", u.uid, "bookmarks"));
        const s = new Set<string>();
        snap.forEach((d) => s.add(d.id));
        setBookmarkIds(s);
      } catch {
        setBookmarkIds(new Set());
      }
    });

    return () => unsub();
  }, []);

  // ----------------------------
  // uid -> username
  // ----------------------------
  const fetchUsernames = async (uids: string[]) => {
    const uniq = Array.from(new Set(uids)).filter(Boolean);
    if (uniq.length === 0) return;

    const map: Record<string, string> = {};
    for (const group of chunk(uniq, 10)) {
      const q = query(collection(db, "users"), where(documentId(), "in", group));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const x = d.data() as any;
        const name =
          typeof x?.username === "string" && x.username.trim() ? x.username.trim() : "名無し";
        map[d.id] = name;
      });
    }
    setUsernameMap((p) => ({ ...p, ...map }));
  };

  // ----------------------------
  // Fetch post
  // ----------------------------
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!postId) return;

      setLoadingPost(true);
      try {
        const snap = await getDoc(doc(db, "posts", postId));
        if (!alive) return;

        if (!snap.exists()) {
          setPost(null);
          setLoadingPost(false);
          return;
        }

        const data = snap.data() as any;
        const likeUids: string[] = Array.isArray(data.likeUids) ? data.likeUids : [];
        const authorId = data.authorId ?? "";

        // ✅ 修正：投稿の authorName ではなく、users/{authorId}.username を優先
        let authorName = data.authorName ?? "名無し";
        try {
          if (authorId) {
            const us = await getDoc(doc(db, "users", authorId));
            const ud = us.exists() ? (us.data() as any) : null;
            const latest =
              typeof ud?.username === "string" && ud.username.trim() ? ud.username.trim() : "";
            if (latest) authorName = latest;
          }
        } catch {
          // 握りつぶし
        }

        const me = auth.currentUser?.uid ?? "";
        const liked = me ? likeUids.includes(me) : false;
        const bookmarked = me ? bookmarkIds.has(postId) : false;

        setPost({
          id: snap.id,

          // ✅ 追加：title / tags を取得して表示に使う
          title: typeof data.title === "string" ? data.title : data.title ?? null,
          tags: Array.isArray(data.tags) ? data.tags : [],

          catchcopy: data.catchcopy ?? "",
          body: data.body ?? "",
          genre: data.genre ?? "その他",
          url: data.url ?? "",
          author: authorName,
          authorId,
          createdAt: data.createdAt ?? null,
          likeCount: typeof data.likeCount === "number" ? data.likeCount : likeUids.length,
          bookmarkCount: typeof data.bookmarkCount === "number" ? data.bookmarkCount : 0,
          liked,
          bookmarked,
        });

        if (authorId) {
          await fetchUsernames([authorId]);
        }
      } catch (e) {
        console.error("post fetch failed:", e);
        setPost(null);
      } finally {
        if (alive) setLoadingPost(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [postId, bookmarkIds]);

  // ----------------------------
  // Fetch comments
  // ----------------------------
  const fetchComments = async () => {
    if (!postId) return;

    setLoadingComments(true);
    try {
      const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);

      const list: Comment[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          body: x.body ?? "",
          authorId: x.authorId ?? "",
          parentId: x.parentId ?? null,
          createdAt: x.createdAt,
          likeCount: x.likeCount ?? 0,
          likeUids: Array.isArray(x.likeUids) ? x.likeUids : [],
        };
      });

      setComments(list);
      await fetchUsernames(list.map((c) => c.authorId).filter(Boolean));
    } catch (e) {
      console.error("comments fetch failed:", e);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // ----------------------------
  // ✅ 投稿：面白そうトグル + 通知
  // ----------------------------
  const togglePostLike = async () => {
    if (!user) {
      alert("ログインしてください");
      return;
    }
    if (!post) return;

    const alreadyLiked = !!post.liked;

    try {
      await updateDoc(doc(db, "posts", postId), {
        likeCount: increment(alreadyLiked ? -1 : 1),
        likeUids: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      // ✅ 通知：押した時だけ（解除では送らない）
      if (!alreadyLiked) {
        const toUid = post.authorId ?? "";
        if (toUid && toUid !== user.uid) {
          await addDoc(collection(db, "users", toUid, "notifications"), {
            type: "like",
            fromUid: user.uid,
            fromName: myUsername || null,
            postId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      setPost((p) =>
        !p
          ? p
          : {
              ...p,
              liked: !alreadyLiked,
              likeCount: Math.max(0, (p.likeCount ?? 0) + (alreadyLiked ? -1 : 1)),
            }
      );
    } catch (e) {
      console.error("togglePostLike failed:", e);
      alert("面白そう！の更新に失敗しました（権限/ルールを確認）");
    }
  };

  // ----------------------------
  // ✅ 投稿：ブックマークトグル + 通知
  // ----------------------------
  const togglePostBookmark = async () => {
    if (!user) {
      alert("ログインしてください");
      return;
    }
    if (!post) return;

    const already = !!post.bookmarked;

    try {
      const ref = doc(db, "users", user.uid, "bookmarks", postId);

      if (already) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          postId,
          bookmarkedAt: serverTimestamp(),
          catchcopy: post.catchcopy ?? "",
          body: post.body ?? "",
          author: post.author ?? "名無し",
          authorId: post.authorId ?? "",
          genre: post.genre ?? "その他",
          url: post.url ?? "",

          // ✅ 追加：トップページ同様に保存（任意）
          title: post.title ?? null,
          tags: Array.isArray(post.tags) ? post.tags : [],
        });

        // ✅ 通知：付けた時だけ
        const toUid = post.authorId ?? "";
        if (toUid && toUid !== user.uid) {
          await addDoc(collection(db, "users", toUid, "notifications"), {
            type: "bookmark",
            fromUid: user.uid,
            fromName: myUsername || null,
            postId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      await updateDoc(doc(db, "posts", postId), {
        bookmarkCount: increment(already ? -1 : 1),
      });

      // ✅ ローカル反映
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (already) next.delete(postId);
        else next.add(postId);
        return next;
      });

      setPost((p) =>
        !p
          ? p
          : {
              ...p,
              bookmarked: !already,
              bookmarkCount: Math.max(0, (p.bookmarkCount ?? 0) + (already ? -1 : 1)),
            }
      );
    } catch (e) {
      console.error("togglePostBookmark failed:", e);
      alert("ブックマークの更新に失敗しました（権限/ルールを確認）");
    }
  };

  // ----------------------------
  // Submit comment / reply + notify
  // ----------------------------
  const submitComment = async () => {
    if (!user) {
      alert("ログインしてください");
      return;
    }
    const text = input.trim();
    if (!text) return;

    await addDoc(collection(db, "posts", postId, "comments"), {
      body: text,
      authorId: user.uid,
      parentId: replyTo ?? null,
      createdAt: serverTimestamp(),
      likeCount: 0,
      likeUids: [],
    });

    // ✅ 通知（失敗してもコメント投稿は成功させたい）
    try {
      const fromName = myUsername || null;

      if (replyTo) {
        // 返信：親コメント作者へ通知
        const parent = comments.find((c) => c.id === replyTo);
        const parentAuthorId = parent?.authorId ?? "";
        if (parentAuthorId && parentAuthorId !== user.uid) {
          await addDoc(collection(db, "users", parentAuthorId, "notifications"), {
            type: "comment",
            fromUid: user.uid,
            fromName,
            postId,
            parentCommentId: replyTo,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      } else {
        // 通常コメント：投稿者へ通知
        const toUid = post?.authorId ?? "";
        if (toUid && toUid !== user.uid) {
          await addDoc(collection(db, "users", toUid, "notifications"), {
            type: "comment",
            fromUid: user.uid,
            fromName,
            postId,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      }
    } catch {
      // 握りつぶし
    }

    setInput("");
    setReplyTo(null);
    await fetchComments();
  };

  // ----------------------------
  // ✅ コメントいいね + 通知（いいねした時のみ）
  // ----------------------------
  const toggleCommentLike = async (comment: Comment) => {
    if (!user) {
      alert("ログインしてください");
      return;
    }

    const ref = doc(db, "posts", postId, "comments", comment.id);
    const liked = comment.likeUids.includes(user.uid);

    await updateDoc(ref, {
      likeCount: increment(liked ? -1 : 1),
      likeUids: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });

    // ✅ 通知：いいねした時のみ（解除は送らない）
    if (!liked) {
      try {
        const toUid = comment.authorId ?? "";
        if (toUid && toUid !== user.uid) {
          await addDoc(collection(db, "users", toUid, "notifications"), {
            type: "comment_like",
            fromUid: user.uid,
            fromName: myUsername || null,
            postId,
            commentId: comment.id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      } catch {
        // 握りつぶし
      }
    }

    await fetchComments();
  };

  const { roots, replies } = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    const replies = comments.filter((c) => !!c.parentId);
    return { roots, replies };
  }, [comments]);

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: 'url("/hero-night-road.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        color: "white",
        padding: "18px 12px 60px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
            cursor: "pointer",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          ← 戻る
        </button>

        {loadingPost ? (
          <div style={{ opacity: 0.85 }}>読み込み中…</div>
        ) : !post ? (
          <div style={{ opacity: 0.85 }}>投稿が見つかりませんでした。</div>
        ) : (
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              @{post.author} / {post.genre}
              {post.createdAt && <> ・ {post.createdAt.toDate?.().toLocaleString?.()}</>}
            </div>

            {/* ✅ 修正：タイトル（任意）をキャッチコピーと同じ色・サイズに */}
            {!!(post.title && String(post.title).trim()) && (
              <h1
                style={{
                  fontSize: 20,
                  marginTop: 8,
                  marginBottom: 10,
                  color: "#FFD978",
                  textShadow: "0 0 10px rgba(255, 217, 120, 0.35)",
                }}
              >
                {post.title}
              </h1>
            )}

            {/* ✅ 追加：タグ（任意） */}
            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {post.tags.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.08)",
                      color: "white",
                      opacity: 0.95,
                      whiteSpace: "nowrap",
                    }}
                    title={`#${t}`}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* ✅ ここだけ変更：PostList と同じ黄色 + うっすら発光 */}
            <h1
              style={{
                fontSize: 20,
                marginTop: 8,
                marginBottom: 10,
                color: "#FFD978",
                textShadow: "0 0 10px rgba(255, 217, 120, 0.35)",
              }}
            >
              {post.catchcopy}
            </h1>

            <p style={{ lineHeight: 1.8, opacity: 0.95, whiteSpace: "pre-wrap" }}>{post.body}</p>

            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  fontSize: 12,
                  color: "#9ecbff",
                  textDecoration: "underline",
                }}
              >
                {post.url}
              </a>
            )}

            {/* ✅ 追加：面白そう / ブックマーク */}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={togglePostLike}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  cursor: user ? "pointer" : "not-allowed",
                  opacity: user ? 1 : 0.6,
                  fontSize: 12,
                  fontWeight: 800,
                }}
                title={!user ? "ログインしてください" : undefined}
              >
                {post.liked ? "♥" : "♡"} {post.likeCount ?? 0}
              </button>

              <button
                type="button"
                onClick={togglePostBookmark}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  cursor: user ? "pointer" : "not-allowed",
                  opacity: user ? 1 : 0.6,
                  fontSize: 12,
                  fontWeight: 800,
                }}
                title={!user ? "ログインしてください" : undefined}
              >
                {post.bookmarked ? "🔖" : "📑"} {post.bookmarkCount ?? 0}
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                borderTop: "1px solid rgba(255,255,255,0.12)",
                paddingTop: 16,
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: 10 }}>コメント {comments.length}</div>

              {loadingComments ? (
                <div style={{ opacity: 0.85 }}>コメント読み込み中…</div>
              ) : (
                <div>
                  {roots.map((c) => {
                    const liked = user ? c.likeUids.includes(user.uid) : false;
                    const children = replies.filter((r) => r.parentId === c.id);

                    return (
                      <div key={c.id} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                          @{usernameMap[c.authorId] ?? "名無し"} ・{" "}
                          {c.createdAt?.toDate?.().toLocaleString?.() ?? ""}
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>

                        <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => toggleCommentLike(c)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.15)",
                              background: "rgba(255,255,255,0.08)",
                              color: "white",
                              cursor: user ? "pointer" : "not-allowed",
                              fontSize: 12,
                              opacity: user ? 1 : 0.6,
                            }}
                            title={!user ? "ログインしてください" : undefined}
                          >
                            {liked ? "♥" : "♡"} {c.likeCount}
                          </button>

                          <button
                            type="button"
                            onClick={() => setReplyTo(c.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.15)",
                              background: "rgba(255,255,255,0.08)",
                              color: "white",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            返信
                          </button>
                        </div>

                        {children.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              marginTop: 10,
                              marginLeft: 18,
                              paddingLeft: 10,
                              borderLeft: "2px solid rgba(255,255,255,0.2)",
                            }}
                          >
                            <div style={{ fontSize: 12, opacity: 0.85 }}>
                              @{usernameMap[r.authorId] ?? "名無し"} → @{usernameMap[c.authorId] ?? "名無し"} ・{" "}
                              {r.createdAt?.toDate?.().toLocaleString?.() ?? ""}
                            </div>
                            <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {comments.length === 0 && <div style={{ opacity: 0.8 }}>まだコメントはありません。</div>}
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                {replyTo && (
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                    返信先：@
                    {usernameMap[comments.find((c) => c.id === replyTo)?.authorId ?? ""] ?? "名無し"}
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      style={{
                        marginLeft: 8,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.08)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      解除
                    </button>
                  </div>
                )}

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={replyTo ? "返信を書く…" : "コメントを書く"}
                  style={{
                    width: "100%",
                    minHeight: 80,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={loadingAuth || !user}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      background: "#4b84d8",
                      border: "none",
                      color: "white",
                      cursor: loadingAuth || !user ? "not-allowed" : "pointer",
                      opacity: loadingAuth || !user ? 0.6 : 1,
                      fontWeight: "bold",
                    }}
                    title={!user ? "ログインしてください" : undefined}
                  >
                    送信
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
