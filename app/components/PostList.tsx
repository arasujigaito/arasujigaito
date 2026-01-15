// app/components/PostList.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  where,
  documentId,
  getCountFromServer,
} from "firebase/firestore";
import { auth, db } from "../firebase";

type Post = {
  id: number | string;

  // ✅ タイトル（任意）
  title?: string | null;

  catchcopy: string;
  body: string;
  author: string;
  genre: string;
  url?: string;

  // ✅ タグ（任意）
  tags?: string[];

  likeCount?: number;
  liked?: boolean;
  bookmarked?: boolean;

  // ✅ 追加：ブックマーク数
  bookmarkCount?: number;

  // ✅ 投稿日時
  createdAt?: any;

  // ✅ 追加：自分投稿判定（マイページ削除ボタン用）
  authorId?: string;
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

type Props = {
  posts: Post[];
  onLike: (id: number | string) => void;
  onComment: (id: number | string) => void;
  onBookmark: (id: number | string) => void;

  // ✅ 追加：渡されたときだけ削除ボタンを出す
  onDelete?: (id: number | string) => void;
};

export default function PostList({
  posts,
  onLike,
  onComment,
  onBookmark,
  onDelete,
}: Props) {
  const router = useRouter();
  const user = auth.currentUser;

  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [input, setInput] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});

  // ✅ コメント数（返信含む）キャッシュ
  const [commentCountMap, setCommentCountMap] = useState<Record<string, number>>({});

  // ✅ 本文「さらに表示」用
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // ✅ 追加：本文が“実際に”はみ出しているかの判定（改行なし長文でもOK）
  const bodyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({});

  // ✅ 追加：スマホはクランプ行数を増やしてPCの体感量に寄せる
  const [clampLines, setClampLines] = useState<number>(5);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)"); // 768未満をスマホ扱い
    const apply = () => setClampLines(mq.matches ? 8 : 5); // ✅ スマホ=8行 / PC=5行
    apply();

    const handler = () => apply();
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  // ✅ 追加：ユーザーへ遷移（自分ならマイページ）
  const goUser = (uid?: string) => {
    if (!uid) return;
    const me = auth.currentUser?.uid;
    if (me && uid === me) router.push("/mypage");
    else router.push(`/u/${uid}`);
  };

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const ids = posts.map((p) => String(p.id));
      const missing = ids.filter((id) => commentCountMap[id] === undefined);
      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (postId) => {
            const colRef = collection(db, "posts", postId, "comments");
            const snap = await getCountFromServer(colRef);
            return [postId, snap.data().count] as const;
          })
        );

        if (!alive) return;

        setCommentCountMap((prev) => {
          const next = { ...prev };
          for (const [postId, count] of results) next[postId] = count;
          return next;
        });
      } catch (e) {
        console.error("コメント数の取得に失敗:", e);
      }
    };

    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  // ✅ FIX：クランプ状態の高さ と 全文高さ を比較して hasMore を確実に出す
  useEffect(() => {
    let raf = 0;

    raf = window.requestAnimationFrame(() => {
      const next: Record<string, boolean> = {};

      for (const p of posts) {
        const postId = String(p.id);
        const el = bodyRefs.current[postId];
        if (!el) continue;

        // expanded のときは「さらに表示」を出す必要がないので false
        if (expandedMap[postId]) {
          next[postId] = false;
          continue;
        }

        // ① まずクランプ状態の高さを取る（現状のstyleのまま）
        const clampedH = el.clientHeight;

        // ② 一瞬だけ“全文表示スタイル”にして高さを取る（確実に判定）
        const prevDisplay = el.style.display;
        const prevBoxOrient = (el.style as any).WebkitBoxOrient;
        const prevLineClamp = (el.style as any).WebkitLineClamp;
        const prevOverflow = el.style.overflow;

        el.style.display = "block";
        (el.style as any).WebkitBoxOrient = "initial";
        (el.style as any).WebkitLineClamp = "initial";
        el.style.overflow = "visible";

        const fullH = el.scrollHeight;

        // ③ 戻す
        el.style.display = prevDisplay;
        (el.style as any).WebkitBoxOrient = prevBoxOrient;
        (el.style as any).WebkitLineClamp = prevLineClamp;
        el.style.overflow = prevOverflow;

        // ④ 全文の方が高ければ「さらに表示」対象
        next[postId] = fullH > clampedH + 1;
      }

      setHasMoreMap(next);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [posts, expandedMap, clampLines]); // ✅ clampLines も依存に入れる（スマホ/PCで判定が変わるため）

  // ----------------------------
  // uid -> username
  // ----------------------------
  const fetchUsernames = async (uids: string[]) => {
    const uniq = Array.from(new Set(uids)).filter(Boolean);
    if (uniq.length === 0) return;

    const map: Record<string, string> = {};
    for (let i = 0; i < uniq.length; i += 10) {
      const q = query(collection(db, "users"), where(documentId(), "in", uniq.slice(i, i + 10)));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        map[d.id] = (d.data() as any)?.username ?? "名無し";
      });
    }
    setUsernameMap((p) => ({ ...p, ...map }));
  };

  // ----------------------------
  // コメント取得
  // ----------------------------
  const fetchComments = async (postId: string) => {
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

    setComments((p) => ({ ...p, [postId]: list }));
    fetchUsernames(list.map((c) => c.authorId));

    // ✅ 開いたタイミングでコメント数も同期（返信含む総数）
    setCommentCountMap((prev) => ({ ...prev, [postId]: list.length }));
  };

  // ----------------------------
  // コメント投稿
  // ----------------------------
  const submitComment = async (postId: string) => {
    if (!user) return;
    const text = input[postId]?.trim();
    if (!text) return;

    const newRef = await addDoc(collection(db, "posts", postId, "comments"), {
      body: text,
      authorId: user.uid,
      parentId: replyTo ?? null,
      createdAt: serverTimestamp(),
      likeCount: 0,
      likeUids: [],
    });
    const newCommentId = newRef.id;

    try {
      const post = posts.find((p) => String(p.id) === postId);
      const postAuthorId = post?.authorId ?? "";
      const fromName = usernameMap[user.uid] ?? null;

      if (replyTo) {
        const list = comments[postId] ?? [];
        const parent = list.find((c) => c.id === replyTo);
        const parentAuthorId = parent?.authorId ?? "";

        if (parentAuthorId && parentAuthorId !== user.uid) {
          await addDoc(collection(db, "users", parentAuthorId, "notifications"), {
            type: "comment",
            fromUid: user.uid,
            fromName,
            postId,
            commentId: newCommentId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        if (postAuthorId && postAuthorId !== user.uid) {
          await addDoc(collection(db, "users", postAuthorId, "notifications"), {
            type: "comment",
            fromUid: user.uid,
            fromName,
            postId,
            commentId: newCommentId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch {
      // 握りつぶし
    }

    setInput((p) => ({ ...p, [postId]: "" }));
    setReplyTo(null);
    fetchComments(postId);
  };

  // ----------------------------
  // コメント ♥（✅ いいね通知も追加）
  // ----------------------------
  const toggleCommentLike = async (postId: string, comment: Comment) => {
    if (!user) return;

    const ref = doc(db, "posts", postId, "comments", comment.id);
    const alreadyLiked = comment.likeUids.includes(user.uid);

    await updateDoc(ref, {
      likeCount: increment(alreadyLiked ? -1 : 1),
      likeUids: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });

    if (!alreadyLiked && comment.authorId && comment.authorId !== user.uid) {
      try {
        const fromName = usernameMap[user.uid] ?? null;

        await addDoc(collection(db, "users", comment.authorId, "notifications"), {
          type: "comment_like",
          fromUid: user.uid,
          fromName,
          postId,
          commentId: comment.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch {
        // 握りつぶし
      }
    }

    fetchComments(postId);
  };

  // ----------------------------
  // ✅ X風：入れ子にせず “フラットに並べる”
  // ----------------------------
  const buildThreadView = (all: Comment[]) => {
    const byId = new Map<string, Comment>();
    all.forEach((c) => byId.set(c.id, c));

    const childrenMap = new Map<string, Comment[]>();
    all.forEach((c) => {
      if (!c.parentId) return;
      const key = c.parentId;
      const arr = childrenMap.get(key) ?? [];
      arr.push(c);
      childrenMap.set(key, arr);
    });

    for (const [k, arr] of childrenMap.entries()) {
      arr.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
      childrenMap.set(k, arr);
    }

    const roots = all.filter((c) => !c.parentId);

    type Row = { c: Comment; depth: number };

    const rows: Row[] = [];
    const visited = new Set<string>();

    const dfs = (c: Comment, depth: number) => {
      if (visited.has(c.id)) return;
      visited.add(c.id);
      rows.push({ c, depth });
      const kids = childrenMap.get(c.id) ?? [];
      kids.forEach((ch) => dfs(ch, Math.min(depth + 1, 3)));
    };

    roots.forEach((r) => dfs(r, 0));

    return { rows, byId };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {posts.map((post) => {
        const postId = String(post.id);
        const postComments = comments[postId] ?? [];

        const likeCount = typeof post.likeCount === "number" ? post.likeCount : 0;
        const liked = !!post.liked;
        const bookmarked = !!post.bookmarked;
        const bookmarkCount = typeof post.bookmarkCount === "number" ? post.bookmarkCount : 0;
        const commentCount = typeof commentCountMap[postId] === "number" ? commentCountMap[postId] : 0;

        const canDelete = !!onDelete && !!user && post.authorId && post.authorId === user.uid;

        const replyToName = (() => {
          if (!replyTo) return null;
          const list = comments[postId] ?? [];
          const parent = list.find((c) => c.id === replyTo);
          if (!parent) return null;
          return usernameMap[parent.authorId] ?? "名無し";
        })();

        const threadView = openPostId === postId ? buildThreadView(postComments) : null;

        const expanded = !!expandedMap[postId];
        const hasMore = !!hasMoreMap[postId];

        // ✅ タグ表示文字
        const tags = Array.isArray(post.tags) ? post.tags : [];
        const tagText = tags.length > 0 ? tags.map((t) => `#${t}`).join(" ") : "";

        return (
          <div
            key={postId}
            style={{
              padding: 20,
              borderRadius: 16,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            {/* 投稿ヘッダ */}
            <div
              style={{
                fontSize: 12,
                display: "flex",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span style={{ opacity: 0.8 }}>
                @
                <span
                  onClick={() => {
                    const me = auth.currentUser?.uid;
                    if (post.authorId && me && post.authorId === me) {
                      router.push("/mypage");
                      return;
                    }
                    if (post.authorId) {
                      router.push(`/u/${post.authorId}`);
                      return;
                    }
                  }}
                  style={{
                    cursor: post.authorId ? "pointer" : "default",
                    textDecoration: post.authorId ? "underline" : "none",
                    opacity: 1,
                  }}
                  title={post.authorId ? "プロフィールを見る" : undefined}
                >
                  {post.author}
                </span>
              </span>

              {/* ✅ タイトル：ユーザー名のすぐ横（黄色 / 18px） */}
              {String(post.title ?? "").trim().length > 0 && (
                <span
                  onClick={() => router.push(`/p/${postId}`)}
                  title="投稿の詳細を見る"
                  style={{
                    fontSize: 18,
                    color: "#FFD978",
                    textShadow: "0 0 10px rgba(255, 217, 120, 0.35)",
                    cursor: "pointer",
                    lineHeight: 1.2,
                    opacity: 1,
                  }}
                >
                  {String(post.title)}
                </span>
              )}

              {/* ✅ ジャンル：薄く見せたいので個別に opacity を付与 */}
              <span style={{ fontSize: 12, opacity: 0.8 }}>/ {post.genre}</span>

              {/* ✅ タグ：ジャンルと同じサイズ色（薄め） */}
              {tagText && <span style={{ fontSize: 12, opacity: 0.8 }}>{tagText}</span>}

              {post.createdAt && (
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  ・ {post.createdAt.toDate?.().toLocaleString?.()}
                </span>
              )}
            </div>

            {/* ✅ キャッチコピー（黄色） */}
            <h2
              style={{
                fontSize: 18,
                marginTop: 6,
                marginBottom: 10,
                cursor: "pointer",
                color: "#FFD978",
                textShadow: "0 0 10px rgba(255, 217, 120, 0.35)",
              }}
              onClick={() => router.push(`/p/${postId}`)}
              title="投稿の詳細を見る"
            >
              {post.catchcopy}
            </h2>

            {/* ✅ 本文：PC=5行 / スマホ=8行 クランプ + はみ出したら「さらに表示」 */}
            <div>
              <div
                ref={(el) => {
                  bodyRefs.current[postId] = el;
                }}
                style={{
                  lineHeight: 1.7,
                  opacity: 0.9,
                  cursor: "pointer",
                  whiteSpace: "pre-wrap",
                  ...(expanded
                    ? {}
                    : {
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical" as any,
                        WebkitLineClamp: clampLines as any, // ✅ ここだけ変更
                        overflow: "hidden",
                      }),
                }}
                onClick={() => router.push(`/p/${postId}`)}
                title="投稿の詳細を見る"
              >
                {post.body}
              </div>

              {!expanded && hasMore && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpandedMap((p) => ({ ...p, [postId]: true }));
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    marginTop: 6,
                    color: "#9ecbff",
                    cursor: "pointer",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  さらに表示
                </button>
              )}
            </div>

            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 12,
                  color: "#9ecbff",
                  textDecoration: "underline",
                }}
              >
                {post.url}
              </a>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={() => onLike(post.id)} style={{ cursor: "pointer" }}>
                {liked ? "♥" : "♡"} 面白そう {likeCount}
              </button>

              <button type="button" onClick={() => onBookmark(post.id)} style={{ cursor: "pointer" }}>
                {bookmarked ? "🔖" : "📑"} ブックマーク {bookmarkCount}
              </button>

              <button
                type="button"
                onClick={() => {
                  const open = openPostId === postId ? null : postId;
                  setOpenPostId(open);
                  if (open) fetchComments(postId);
                }}
                style={{ cursor: "pointer" }}
              >
                💬 コメント {commentCount}
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    const ok = confirm("この投稿を削除しますか？（コメントも消えます）");
                    if (!ok) return;
                    onDelete?.(post.id);
                  }}
                  style={{
                    marginLeft: "auto",
                    opacity: 0.9,
                    cursor: "pointer",
                  }}
                >
                  🗑 削除
                </button>
              )}
            </div>

            {openPostId === postId && (
              <div style={{ marginTop: 16 }}>
                {threadView?.rows.map(({ c, depth }) => {
                  const liked = user ? c.likeUids.includes(user.uid) : false;

                  const parent = c.parentId ? threadView.byId.get(c.parentId) ?? null : null;
                  const parentAuthorId = parent?.authorId ?? null;

                  const isReply = !!c.parentId;

                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 0",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          flex: "0 0 22px",
                          position: "relative",
                          opacity: 0.8,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 10,
                            top: 0,
                            bottom: 0,
                            width: 0,
                            borderLeft: "2px solid rgba(255,255,255,0.15)",
                          }}
                        />
                        {isReply && (
                          <div
                            style={{
                              position: "absolute",
                              left: 2,
                              top: 10,
                              fontSize: 12,
                              opacity: Math.max(0.55, 0.85 - depth * 0.1),
                            }}
                          >
                            ↳
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          @
                          <span
                            onClick={() => goUser(c.authorId)}
                            style={{
                              cursor: c.authorId ? "pointer" : "default",
                              textDecoration: c.authorId ? "underline" : "none",
                            }}
                            title="プロフィールを見る"
                          >
                            {usernameMap[c.authorId] ?? "名無し"}
                          </span>

                          {parentAuthorId && (
                            <>
                              {" "}
                              ・ 返信先 @
                              <span
                                onClick={() => goUser(parentAuthorId)}
                                style={{
                                  cursor: parentAuthorId ? "pointer" : "default",
                                  textDecoration: parentAuthorId ? "underline" : "none",
                                }}
                                title="返信先のプロフィールを見る"
                              >
                                {usernameMap[parentAuthorId] ?? "名無し"}
                              </span>
                            </>
                          )}{" "}
                          ・ {c.createdAt?.toDate?.().toLocaleString?.() ?? ""}
                        </div>

                        <div style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>

                        <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => toggleCommentLike(postId, c)}
                            style={{ cursor: "pointer" }}
                          >
                            {liked ? "♥" : "♡"} {c.likeCount}
                          </button>

                          <button type="button" onClick={() => setReplyTo(c.id)} style={{ cursor: "pointer" }}>
                            返信
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {replyToName && (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                    返信先：@{replyToName}{" "}
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      style={{ cursor: "pointer", marginLeft: 8 }}
                    >
                      取消
                    </button>
                  </div>
                )}

                <textarea
                  value={input[postId] ?? ""}
                  onChange={(e) =>
                    setInput((p) => ({
                      ...p,
                      [postId]: e.target.value,
                    }))
                  }
                  placeholder={replyTo ? "返信を書く…" : "コメントを書く"}
                  style={{ width: "100%", minHeight: 60, marginTop: 8 }}
                />
                <button type="button" onClick={() => submitComment(postId)} style={{ cursor: "pointer" }}>
                  送信
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
