// app/post/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function NewPostPage() {
  // ✅ タイトル（任意）
  const [title, setTitle] = useState("");
  // ✅ キャッチコピー（任意）
  const [catchcopy, setCatchcopy] = useState("");

  // ✅ あらすじ本文（必須）
  const [body, setBody] = useState("");
  // ✅ URL（任意）
  const [url, setUrl] = useState("");
  // ✅ ジャンル（必須）
  const [genre, setGenre] = useState("");

  // ✅ 追加：タグ（任意）
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const GENRES = [
    "ファンタジー",
    "SF",
    "恋愛・ラブコメ",
    "現代ドラマ",
    "ホラー",
    "ミステリー・サスペンス",
    "コメディ",
    "エッセイ・ノンフィクション",
    "歴史",
    "その他",
  ];

  const TITLE_MAX = 63;
  const CATCHCOPY_MAX = 37;
  const BODY_MAX = 500; // ✅ 追加：本文上限を一箇所で管理

  // ログイン状態の監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ✅ 必須：本文 + ジャンル（タイトル/キャッチコピー/URL/タグは任意）
  const isValid =
    body.trim().length > 0 && body.length <= BODY_MAX && genre.trim().length > 0;

  // ✅ タグ追加（最大8個）
  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    if (tags.length >= 8) {
      alert("タグは8個まで設定できます");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("投稿するにはログインが必要です。");
      return;
    }

    // ✅ グレー状態で押されたらメッセージ表示
    if (!isValid) {
      alert("必須項目（あらすじ本文・ジャンル）を入力してください。");
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      await addDoc(collection(db, "posts"), {
        // ✅ 互換性のため catchcopy は残しつつ、title も保存
        title: title.trim() || null,
        catchcopy: catchcopy.trim() || null,

        body: body.trim(),
        url: url.trim() || null,
        genre,
        tags, // ✅ 追加
        authorId: user.uid,
        authorName: user.displayName || user.email || "名無し",
        createdAt: serverTimestamp(),
        likeCount: 0,
        likeUids: [],
      });

      alert("あらすじを投稿しました！");
      window.location.href = "/";
    } catch (e: any) {
      console.error(e);
      alert("投稿に失敗しました：" + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    window.history.length > 1 ? window.history.back() : (window.location.href = "/");
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
        justifyContent: "center",
        padding: "24px 12px",
        color: "white",
      }}
    >
      {/* カード */}
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          background: "rgba(0,0,0,0.55)", // ✅ 統一
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>あらすじの投稿</h1>

        {/* ✅ タイトル（任意 / 63文字まで） */}
        <label style={{ fontSize: 13 }}>
          タイトル（任意 / {TITLE_MAX}文字まで）
          <span style={{ fontSize: 12, opacity: 0.75, marginLeft: 8 }}>
            {title.length} / {TITLE_MAX}
          </span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          style={inputStyle}
        />

        {/* ✅ キャッチコピー（任意 / 37文字まで） */}
        <label style={{ fontSize: 13 }}>
          キャッチコピー（任意 / {CATCHCOPY_MAX}文字まで）
          <span style={{ fontSize: 12, opacity: 0.75, marginLeft: 8 }}>
            {catchcopy.length} / {CATCHCOPY_MAX}
          </span>
        </label>
        <input
          value={catchcopy}
          onChange={(e) => setCatchcopy(e.target.value)}
          maxLength={CATCHCOPY_MAX}
          style={inputStyle}
        />

        {/* 本文（必須） */}
        <label style={{ fontSize: 13 }}>あらすじ本文（必須 / {BODY_MAX}文字まで）</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          style={{ ...inputStyle, height: 140 }}
        />
        <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>
          {body.length} / {BODY_MAX}
        </div>

        {/* URL（任意） */}
        <label style={{ fontSize: 13 }}>作品リンク（任意）</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} />

        {/* ジャンル（必須） */}
        <label style={{ fontSize: 13 }}>ジャンル（必須）</label>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} style={inputStyle}>
          <option value="">選択してください</option>
          {GENRES.map((g) => (
            <option key={g} value={g} style={{ color: "black" }}>
              {g}
            </option>
          ))}
        </select>

        {/* ✅ タグ（任意） */}
        <label style={{ fontSize: 13, marginTop: 12 }}>タグ（任意 / 最大8個）</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="例：異世界 / 学園"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addTag} style={chipButton}>
            追加
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {tags.map((t) => (
            <span key={t} style={chip}>
              #{t}
              <button onClick={() => removeTag(t)} style={chipRemove}>
                ×
              </button>
            </span>
          ))}
        </div>

        {/* ボタン */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={handleSubmit}
            // ✅ ログインしてれば押せる（必須未入力でも押したらアラート出す）
            disabled={!user || saving}
            style={{
              padding: 12,
              borderRadius: 999,
              border: "none",
              background: !isValid || !user || saving ? "#64748b" : "#4b84d8",
              color: "white",
              fontWeight: "bold",
              cursor: !user || saving ? "not-allowed" : "pointer",
              opacity: !user || saving ? 0.8 : 1,
            }}
          >
            {saving ? "投稿中..." : "投稿する"}
          </button>

          <button
            onClick={handleBack}
            style={{
              background: "transparent",
              color: "white",
              cursor: "pointer", // ✅ 戻るボタンにカーソルを合わせたら変わる
              border: "none",
              padding: 8,
            }}
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  marginBottom: 12,
};

const chip = {
  background: "rgba(255,255,255,0.12)",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const chipRemove = {
  background: "transparent",
  border: "none",
  color: "white",
  cursor: "pointer",
};

const chipButton = {
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.3)",
  background: "transparent",
  color: "white",
  cursor: "pointer",
};
