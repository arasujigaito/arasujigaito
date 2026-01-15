// app/page.tsx
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  addDoc, // ✅ 追加：通知作成に使う
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  where,
  documentId,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// ✅ ここだけ修正（./components → ../components）
import HeaderBar from "./components/HeaderBar";
import PostList from "./components/PostList";
import GenreSidebar from "./components/GenreSidebar";
import BottomNav from "./components/BottomNav";

// ✅ ダミーデータファイルを消すので import を削除
// import { GENRES } from "./data/dummyData";

// ✅ 代わりにこのファイル内で定義（最小変更）
const GENRES = [
  "すべて",
  "ファンタジー",
  "SF",
  "恋愛",
  "ミステリー・サスペンス",
  "ホラー",
  "コメディ",
  "青春",
  "エッセイ・ノンフィクション",
  "その他",
];

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

  // ✅ 追加：投稿日時（PostListで表示したいので渡す）
  createdAt?: any;

  likeCount?: number;
  liked?: boolean;
  bookmarked?: boolean;

  // ✅ 追加：ブックマーク数
  bookmarkCount?: number;
};

type UsernameMap = Record<string, string>;
type FeedTab = "new" | "recommended" | "following";

// ✅ 追加：おすすめの期間フィルター
type RecommendedRange = "day" | "all";

function chunk<T>(arr: T[], size: number) {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

// ✅ 追加：createdAt を ms に変換（Timestamp / number / string を最低限対応）
function getCreatedAtMs(createdAt: any): number | null {
  if (!createdAt) return null;

  try {
    // Firestore Timestamp
    if (typeof createdAt?.toDate === "function") {
      const d = createdAt.toDate();
      return d instanceof Date ? d.getTime() : null;
    }
    // number
    if (typeof createdAt === "number") return createdAt;

    // string (ISOなど)
    if (typeof createdAt === "string") {
      const t = Date.parse(createdAt);
      return Number.isFinite(t) ? t : null;
    }

    return null;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>("すべて");
  const [myUsername, setMyUsername] = useState<string>("");

  const [activeTab, setActiveTab] = useState<FeedTab>("new");
  const [remotePosts, setRemotePosts] = useState<UiPost[]>([]);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  // ✅ 追加：おすすめ（日間 / 全体）
  const [recommendedRange, setRecommendedRange] =
    useState<RecommendedRange>("day");

  // ✅ 追加：右側「お知らせ / コンテスト詳細」表示用
  const [rightPanel, setRightPanel] = useState<null | "news" | "contest">(null);

  // ----------------------------
  // スマホ判定
  // ----------------------------
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ----------------------------
  // 認証 & ユーザー情報
  // ----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoadingAuth(false);

      if (!u) {
        setMyUsername("");
        setFollowingUids([]);
        setBookmarkIds(new Set());
        return;
      }

      // username
      const snap = await getDoc(doc(db, "users", u.uid));
      const data = snap.exists() ? (snap.data() as any) : null;
      setMyUsername(data?.username ?? "");

      // ✅ A方式：followingUids は users/{uid}/following の docID から作る
      try {
        const fSnap = await getDocs(
          collection(db, "users", u.uid, "following")
        );
        const ids = fSnap.docs.map((d) => d.id).filter(Boolean);
        setFollowingUids(ids);
      } catch (e) {
        console.error("following の取得に失敗:", e);
        setFollowingUids([]);
      }
    });

    return () => unsub();
  }, []);

  // ----------------------------
  // ブックマーク取得（ログイン/ログアウト両方対応）
  // ----------------------------
  useEffect(() => {
    const run = async () => {
      if (!user) {
        setBookmarkIds(new Set());
        return;
      }

      try {
        const snap = await getDocs(
          collection(db, "users", user.uid, "bookmarks")
        );
        const ids = new Set<string>();
        snap.forEach((d) => ids.add(d.id));
        setBookmarkIds(ids);
      } catch (e) {
        console.error("bookmarks の取得に失敗:", e);
        setBookmarkIds(new Set());
      }
    };

    run();
  }, [user]);

  // ----------------------------
  // uid → username
  // ----------------------------
  const fetchUsernameMap = async (authorIds: string[]) => {
    const uniq = Array.from(new Set(authorIds)).filter(Boolean);
    if (uniq.length === 0) return {};

    const map: UsernameMap = {};
    for (const g of chunk(uniq, 10)) {
      const q = query(collection(db, "users"), where(documentId(), "in", g));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        map[d.id] = (d.data() as any)?.username ?? "名無し";
      });
    }
    return map;
  };

  // ----------------------------
  // 投稿取得（createdAt を載せる）
  // ----------------------------
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        const raw: UiPost[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const likeUids: string[] = Array.isArray(data.likeUids)
            ? data.likeUids
            : [];

          return {
            id: d.id,

            // ✅ 追加：title / tags を取得して PostList に渡す
            title:
              typeof data.title === "string" ? data.title : data.title ?? null,
            tags: Array.isArray(data.tags) ? data.tags : [],

            catchcopy: data.catchcopy ?? "",
            body: data.body ?? "",
            genre: data.genre ?? "その他",
            url: data.url ?? "",
            author: data.authorName ?? "名無し",
            authorId: data.authorId ?? "",

            // ✅ 追加：投稿日時
            createdAt: data.createdAt ?? null,

            likeCount:
              typeof data.likeCount === "number"
                ? data.likeCount
                : likeUids.length,
            liked: user ? likeUids.includes(user.uid) : false,
            bookmarked: user ? bookmarkIds.has(d.id) : false,

            // ✅ 追加：ブックマーク数
            bookmarkCount:
              typeof data.bookmarkCount === "number" ? data.bookmarkCount : 0,
          };
        });

        const map = await fetchUsernameMap(raw.map((p) => p.authorId || ""));
        setRemotePosts(
          raw.map((p) => ({
            ...p,
            author: p.authorId ? map[p.authorId] ?? "名無し" : p.author,
          }))
        );
      } catch (e) {
        console.error("Firestoreから投稿取得に失敗:", e);
      }
    };

    fetchPosts();
  }, [user, bookmarkIds]);

  // ----------------------------
  // ✅ Firestoreだけ（dummy削除）
  // ----------------------------
  const allPosts: UiPost[] = useMemo(() => {
    return [...remotePosts];
  }, [remotePosts]);

  // ----------------------------
  // ✅ FIX: 面白そうトグル
  // ----------------------------
  const handleLike = async (postId: string | number) => {
    if (!user) {
      alert("ログインしてください");
      return;
    }

    const id = String(postId);

    const remote = remotePosts.find((p) => p.id === id);
    const fallback = allPosts.find((p) => p.id === id);
    const post = remote ?? fallback;
    if (!post) return;

    const alreadyLiked = !!post.liked;

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, "posts", id), {
        likeCount: increment(alreadyLiked ? -1 : 1),
        likeUids: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      const likedRef = doc(db, "users", user.uid, "likedPosts", id);

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

          // ✅ 追加：スナップにも title / tags を入れておく（任意）
          title: post.title ?? null,
          tags: Array.isArray(post.tags) ? post.tags : [],
        });
      }

      await batch.commit();

      setRemotePosts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const nextLiked = !alreadyLiked;
          const nextCount = Math.max(
            0,
            (p.likeCount ?? 0) + (alreadyLiked ? -1 : 1)
          );
          return { ...p, liked: nextLiked, likeCount: nextCount };
        })
      );

      // ✅ 追加：面白そう通知（「いいねした時だけ」& 自分宛ては除外）
      if (!alreadyLiked && post.authorId && post.authorId !== user.uid) {
        try {
          await addDoc(
            collection(db, "users", post.authorId, "notifications"),
            {
              type: "like",
              fromUid: user.uid,
              fromName: myUsername || null,
              postId: id,
              commentId: null,
              createdAt: serverTimestamp(),
              read: false,
            }
          );
        } catch {}
      }
    } catch (e) {
      console.error("like update failed:", e);
      alert(
        "面白そう！の更新に失敗しました（権限/ルール/インデックスを確認）"
      );
    }
  };

  // ----------------------------
  // ブックマークトグル（users/{uid}/bookmarks）
  // ----------------------------
  const handleBookmark = async (postId: string | number) => {
    if (!user) {
      alert("ログインしてください");
      return;
    }

    const id = String(postId);
    const post = allPosts.find((p) => p.id === id);
    if (!post) return;

    const alreadyBookmarked = !!post.bookmarked;

    try {
      const batch = writeBatch(db);
      const ref = doc(db, "users", user.uid, "bookmarks", id);

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

          // ✅ 追加：こちらも任意で保存
          title: post.title ?? null,
          tags: Array.isArray(post.tags) ? post.tags : [],
        });
      }

      // ✅ 追加：posts 側にブックマーク数を保持（+1 / -1）
      batch.update(doc(db, "posts", id), {
        bookmarkCount: increment(alreadyBookmarked ? -1 : 1),
      });

      await batch.commit();

      setRemotePosts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const nextBookmarked = !alreadyBookmarked;
          const nextCount = Math.max(
            0,
            (p.bookmarkCount ?? 0) + (alreadyBookmarked ? -1 : 1)
          );
          return { ...p, bookmarked: nextBookmarked, bookmarkCount: nextCount };
        })
      );

      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (alreadyBookmarked) next.delete(id);
        else next.add(id);
        return next;
      });

      // ✅ 追加：ブックマーク通知（「ブックマークした時だけ」& 自分宛ては除外）
      if (!alreadyBookmarked && post.authorId && post.authorId !== user.uid) {
        try {
          await addDoc(
            collection(db, "users", post.authorId, "notifications"),
            {
              type: "bookmark",
              fromUid: user.uid,
              fromName: myUsername || null,
              postId: id,
              commentId: null,
              createdAt: serverTimestamp(),
              read: false,
            }
          );
        } catch {}
      }
    } catch (e) {
      console.error("bookmark update failed:", e);
      alert("ブックマークの更新に失敗しました（権限/ルールを確認）");
    }
  };

  const handleComment = (postId: string | number) => {
    return;
  };

  // ----------------------------
  // ✅ 追加：おすすめフィルターUI（おすすめタブの時だけ表示）
  // ----------------------------
  const RecommendedFilter = () => {
    if (activeTab !== "recommended") return null;

    const pillStyle = (active: boolean): CSSProperties => ({
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.25)",
      background: active ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)",
      color: "white",
      fontSize: 13,
      cursor: "pointer",
      userSelect: "none",
      whiteSpace: "nowrap",
      textAlign: "center",
    });

    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: isMobile ? "flex-start" : "center",
        }}
      >
        <div
          style={pillStyle(recommendedRange === "day")}
          onClick={() => setRecommendedRange("day")}
        >
          日間
        </div>
        <div
          style={pillStyle(recommendedRange === "all")}
          onClick={() => setRecommendedRange("all")}
        >
          全体
        </div>
      </div>
    );
  };

  // ----------------------------
  // タブ
  // ----------------------------
  const tabbed = useMemo(() => {
    if (activeTab === "new") return allPosts;

    if (activeTab === "following") {
      // ✅ フォロー中は followingUids をサブコレから取った値で絞る
      return user
        ? allPosts.filter((p) => followingUids.includes(p.authorId ?? ""))
        : [];
    }

    // ✅ おすすめ：likeCount順 + 日間/全体フィルター
    const sorted = [...allPosts].sort(
      (a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)
    );

    if (recommendedRange === "all") return sorted;

    // day: 今日の0:00〜24:00
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    const endMs = startMs + 24 * 60 * 60 * 1000;

    return sorted.filter((p) => {
      const ms = getCreatedAtMs(p.createdAt);
      if (ms == null) return false; // createdAt無いものは日間に出さない
      return ms >= startMs && ms < endMs;
    });
  }, [activeTab, allPosts, user, followingUids, recommendedRange]);

  // ----------------------------
  // 検索 & ジャンル
  // ----------------------------
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabbed;

    return tabbed.filter((p) => {
      // ✅ tags / title も検索対象に追加（最小変更）
      const tagsText = Array.isArray(p.tags) ? p.tags.join(" ") : "";
      const hay =
        `${p.title ?? ""} ${p.catchcopy} ${p.body} ${p.author} ${p.genre} ${tagsText}`.toLowerCase();

      return hay.includes(q);
    });
  }, [search, tabbed]);

  const byGenre = useMemo(() => {
    if (selectedGenre === "すべて") return searched;
    return searched.filter((p) => p.genre === selectedGenre);
  }, [searched, selectedGenre]);

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
        paddingBottom: isMobile ? 56 : 0,
      }}
    >
      <HeaderBar
        search={search}
        onChangeSearch={setSearch}
        user={user}
        loadingAuth={loadingAuth}
        onLogout={() => signOut(auth)}
        onClickLogin={() => (window.location.href = "/login")}
        onClickRegister={() => (window.location.href = "/signup")}
        isMobile={isMobile}
        genres={GENRES}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        onClickNewPost={() => (window.location.href = "/post/new")}
        activeTab={activeTab as any}
        onChangeTab={setActiveTab as any}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 24,
          padding: "20px 12px 40px",
        }}
      >
        <GenreSidebar
          genres={GENRES}
          selected={selectedGenre}
          onSelect={setSelectedGenre}
          isMobile={isMobile}
        />

        <main style={{ width: "100%", maxWidth: 720 }}>
          {/* ✅ スマホ：投稿カードのすぐ上（幅は変えない） */}
          {isMobile && (
            <div style={{ marginBottom: 10 }}>
              <RecommendedFilter />
            </div>
          )}

          {/* ✅ PC：投稿欄の幅を一切変えず、左に“外側”へabsolute配置 */}
          <div style={{ position: "relative" }}>
            {!isMobile && activeTab === "recommended" && (
              <div
                style={{
                  position: "absolute",
                  left: -98, // ← 投稿欄の外側に出す（投稿欄の幅は変えない）
                  top: 0,
                  width: 86,
                }}
              >
                <RecommendedFilter />
              </div>
            )}

            <PostList
              posts={byGenre as any}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onComment={handleComment}
            />
          </div>
        </main>
      </div>

      {/* ✅ 追加：右横「お知らせ / コンテスト詳細」(レイアウト幅を一切変えないため fixed で配置) */}
      {!isMobile && (
        <div
          style={{
            position: "fixed",
            right: 14,
            top: 118,
            zIndex: 50,
            width: 220,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={() => setRightPanel("news")}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.25)",
              background:
                "linear-gradient(135deg, rgba(255, 120, 0, 0.95), rgba(255, 205, 80, 0.95))",
              color: "#111",
              fontWeight: 900,
              letterSpacing: 0.5,
              cursor: "pointer",
              boxShadow: "0 14px 28px rgba(0,0,0,0.45)",
            }}
          >
            📢 お知らせ
          </button>

          <button
            onClick={() => setRightPanel("contest")}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.25)",
              background:
                "linear-gradient(135deg, rgba(110, 92, 255, 0.95), rgba(170, 120, 255, 0.95))",
              color: "white",
              fontWeight: 900,
              letterSpacing: 0.5,
              cursor: "pointer",
              boxShadow: "0 14px 28px rgba(0,0,0,0.45)",
            }}
          >
            🏆 コンテスト詳細
          </button>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.45)",
              fontSize: 11,
              lineHeight: 1.55,
              opacity: 0.9,
            }}
          >
            クリックで詳細を表示します
          </div>
        </div>
      )}

      {/* ✅ 追加：内容表示（モーダル） */}
      {rightPanel && (
        <div
          onClick={() => setRightPanel(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px 12px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 680,
              borderRadius: 16,
              background: "rgba(0,0,0,0.82)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 22px 60px rgba(0,0,0,0.6)",
              padding: 18,
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 900 }}>
                {rightPanel === "news" ? "お知らせ" : "コンテスト詳細"}
              </h2>
              <button
                onClick={() => setRightPanel(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: "36px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 14,
                lineHeight: 1.8,
                opacity: 0.95,
              }}
            >
              {rightPanel === "news" ? (
                <>
                  <p style={{ marginTop: 0 }}>
                    あらすじ街灯をご利用いただきありがとうございます。
                  </p>

                  <p>以下、お知らせです。</p>

                  <ul style={{ marginLeft: 18, paddingLeft: 0 }}>
                    <li>
                      トライリリース中のため、不具合などが多々あるかと思いますがご了承ください。不具合などがありましたら、XのDMやリプにて受け付けております。
                    </li>
                    <li>
                      トライ期間中は、定期的に一定のユーザーに投稿が再表示される機能はございせん。実施は2月頃を予定です。
                    </li>
                    <li>
                      おすすめの機能は、一旦日間と全体ランキング順になっております。2月頃にXのようなおすすめ機能の仕様にする予定です。
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p style={{ marginTop: 0 }}>
                    キャッチコピーコンテストを1月22日23時59分まで開催しております。参加条件は、キャッチコピー付きであらすじを投稿するだけ！一人あたりの投稿数は問いません。また、キャッチコピー以外のあらすじやタイトルは審査基準にはなりません。いかに、キャッチコピーだけで惹き付けられるかを基準に審査いたします。
                  </p>

                  <p>
                    またトライリリースをしたばかりですので、参加ユーザー数が極端に少ない可能性があります。その観点から、投稿しているユーザー数が50人以上の場合、キャッチコピーコンテスト開催条件とします。
                  </p>

                  <p>
                    独断と偏見で1位、2位、3位、優秀賞を何名かに授与いたします！1位の方には、当サイトにて一定期間その方の作品、もしくはあらすじ投稿自体を宣伝させていただきます。
                  </p>
                </>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                onClick={() => setRightPanel(null)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.10)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav isMobile={isMobile} />
    </div>
  );
}
