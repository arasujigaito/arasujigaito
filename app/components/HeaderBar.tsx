// app/components/HeaderBar.tsx
"use client";

import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import NotificationBell from "./NotificationBell"; // ✅ 追加：通知ベル

type FeedTab = "new" | "recommended" | "following"; // ✅ 追加（タブ用）

type HeaderBarProps = {
  search: string;
  onChangeSearch: (value: string) => void;
  user: User | null;
  loadingAuth: boolean;
  onLogout: () => void | Promise<void>;
  onClickLogin: () => void;
  onClickRegister: () => void;
  isMobile: boolean;
  genres: string[];
  selectedGenre: string;
  onSelectGenre: (g: string) => void;
  onClickNewPost: () => void;

  // ✅ 追加：新着 / おすすめ / フォロー
  activeTab: FeedTab;
  onChangeTab: (t: FeedTab) => void;
};

export default function HeaderBar({
  search,
  onChangeSearch,
  user,
  loadingAuth,
  onLogout,
  onClickLogin,
  onClickRegister,
  isMobile,
  genres,
  selectedGenre,
  onSelectGenre,
  onClickNewPost,
  activeTab,
  onChangeTab,
}: HeaderBarProps) {
  const router = useRouter();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(11, 18, 32, 0.7)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "10px 16px 6px",
      }}
    >
      <div
        style={{
          maxWidth: isMobile ? 960 : 1120, // ✅ PCだけ横幅を広げる（検索欄が確実に広く見える）
          margin: "0 auto",
          width: "100%",

          display: "flex",
          gap: 12,

          flexWrap: isMobile ? "wrap" : "nowrap",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        {/* サイト名 */}
        <div
          style={{
            fontWeight: "bold",
            fontSize: 20,
            color: "#d6e6ff",
            whiteSpace: "nowrap",
            userSelect: "none",
            flex: "0 0 auto",
            marginLeft: -12, // ✅ ここを追加（左にずらす）
          }}
        >
          あらすじ街灯
        </div>

        {/* ✅ 新着 / おすすめ / フォロー */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flex: "0 0 auto",
            flexWrap: "wrap",
          }}
        >
          {([
            { key: "new", label: "新着" },
            { key: "recommended", label: "おすすめ" },
            { key: "following", label: "フォロー" },
          ] as const).map((t) => {
            const active = activeTab === t.key;

            // ✅ フォロータブだけ：未ログインなら無効化
            const disabled = t.key === "following" && (!user || loadingAuth);

            return (
              <button
                key={t.key}
                onClick={() => {
                  if (disabled) {
                    onClickLogin();
                    return;
                  }
                  onChangeTab(t.key);
                }}
                disabled={disabled}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: active
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.08)",
                  color: active ? "#111827" : "white",
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  opacity: disabled ? 0.55 : 1,
                }}
                title={
                  disabled
                    ? "フォロー中の投稿を見るにはログインが必要です"
                    : undefined
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ✅ 検索（スマホは右にログアウトを並べる） */}
        <div
          style={{
            flex: isMobile ? 1 : 2, // ✅ PCだけ検索欄を横にもう少し長く
            minWidth: 120,
            width: isMobile ? "100%" : undefined,
            display: isMobile ? "flex" : undefined,
            gap: isMobile ? 8 : undefined,
            alignItems: isMobile ? "center" : undefined,
          }}
        >
          <input
            type="text"
            placeholder="キーワード・タグ・投稿者で検索"
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              outline: "none",
            }}
          />

          {/* ✅ スマホ版：ログアウトを検索欄の右横へ */}
          {isMobile && !loadingAuth && user && (
            <button
              onClick={async () => {
                await onLogout();
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
                cursor: "pointer",
                fontSize: 12,
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
              title="ログアウト"
            >
              ログアウト
            </button>
          )}
        </div>

        {/* 右側（スマホでは出さないものを整理） */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: isMobile ? "flex-end" : "flex-start",
            width: isMobile ? "100%" : undefined,
          }}
        >
          {loadingAuth ? (
            <span style={{ fontSize: 12, opacity: 0.9 }}>確認中…</span>
          ) : user ? (
            <>
              {/* ✅ 投稿ボタン：スマホでは非表示（下に既にあるため） */}
              {!isMobile && (
                <button
                  onClick={onClickNewPost}
                  style={{
                    padding: isMobile ? "8px 10px" : "6px 14px",
                    borderRadius: 999,
                    background: "#4b84d8",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: "bold",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                    whiteSpace: "nowrap",
                  }}
                  title="投稿"
                >
                  投稿
                </button>
              )}

              {/* ✅ マイページ：スマホでは非表示（下に既にあるため） */}
              {!isMobile && (
                <button
                  onClick={() => {
                    router.push("/mypage");
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    minWidth: isMobile ? 44 : 90,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                  title="マイページへ"
                >
                  マイページ
                </button>
              )}

              {/* ✅ 通知ベル：スマホでは非表示（下に既にあるため） */}
              {!isMobile && (
                <NotificationBell
                  user={user}
                  onClick={() => {
                    router.push("/notifications");
                  }}
                />
              )}

              {/* ✅ ログアウト：PCだけ（スマホは検索欄右に出している） */}
              {!isMobile && (
                <button
                  onClick={async () => {
                    await onLogout();
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                  title="ログアウト"
                >
                  ログアウト
                </button>
              )}
            </>
          ) : (
            <>
              {/* ✅ 投稿ボタン：未ログインでも表示。押したら「ログインをしてください」 */}
              {!isMobile && (
                <button
                  onClick={() => {
                    alert("ログインをしてください");
                  }}
                  style={{
                    padding: isMobile ? "8px 10px" : "6px 14px",
                    borderRadius: 999,
                    background: "#4b84d8",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: "bold",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                    whiteSpace: "nowrap",
                  }}
                  title="投稿"
                >
                  投稿
                </button>
              )}

              {/* ✅ ログインボタン：スマホでは非表示（下のマイページ位置に出すため） */}
              {!isMobile && (
                <button
                  onClick={onClickLogin}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "#3b6fb6",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  ログイン
                </button>
              )}

              {/* ✅ 会員登録：スマホでは非表示でOK */}
              {!isMobile && (
                <button
                  onClick={onClickRegister}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  会員登録
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ジャンルタブ：モバイルだけ */}
      {isMobile && (
        <div
          style={{
            maxWidth: isMobile ? 960 : 1120, // ✅ ここも揃えておく（見た目の一貫性）
            margin: "8px auto 0",
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
            {genres.map((g) => {
              const active = selectedGenre === g;
              return (
                <button
                  key={g}
                  onClick={() => onSelectGenre(g)}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    background: active
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.35)",
                    color: active ? "#111827" : "white",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
