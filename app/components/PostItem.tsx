"use client";

import React from "react";

type PostItemProps = {
  id: number;
  author: string;
  genre: string;
  catchcopy: string; // ← タイトル → キャッチコピーに名称変更
  body: string;
  onLike: (id: number) => void;
  onComment: (id: number) => void;
};

export default function PostItem({
  id,
  author,
  genre,
  catchcopy,
  body,
  onLike,
  onComment,
}: PostItemProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* 投稿者・ジャンル */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          opacity: 0.8,
          fontSize: 12,
        }}
      >
        <span>@{author}</span>
        <span>{genre}</span>
      </div>

      {/* キャッチコピー（タイトル変更） */}
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{catchcopy}</h2>

      {/* 本文 */}
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          opacity: 0.9,
        }}
      >
        {body}
      </p>

      {/* ボタン */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 12,
          opacity: 0.9,
        }}
      >
        <button
          onClick={() => onLike(id)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "white",
          }}
        >
          ♡ 面白そう！
        </button>

        <button
          onClick={() => onComment(id)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "white",
          }}
        >
          💬 コメント
        </button>
      </div>
    </div>
  );
}
