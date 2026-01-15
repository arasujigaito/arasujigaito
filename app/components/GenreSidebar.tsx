"use client";

import React from "react";

type GenreSidebarProps = {
  genres: string[];
  selected: string;
  onSelect: (g: string) => void;
  isMobile: boolean;
};

export default function GenreSidebar({
  genres,
  selected,
  onSelect,
  isMobile,
}: GenreSidebarProps) {
  // スマホは左サイドを表示しない
  if (isMobile) return null;

  return (
    <aside
      style={{
        position: "fixed",
        left: 25,
        top: 96,
        width: 340,
        padding: "20px 18px",
        borderRadius: 16,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(6px)",
        maxHeight: "70vh",
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          fontSize: 15,
          marginBottom: 12,
          opacity: 0.95,
        }}
      >
        ジャンルであらすじを探す
      </h3>

      <div style={{ fontSize: 14, lineHeight: 1.7 }}>
        {genres.map((g) => {
          const active = selected === g;
          return (
            <div
              key={g}
              onClick={() => onSelect(g)}
              style={{
                padding: "8px 8px",
                borderRadius: 8,
                cursor: "pointer",
                marginBottom: 4,
                background: active
                  ? "rgba(255,255,255,0.9)"
                  : "transparent",
                color: active ? "#111" : "white",
              }}
            >
              {g}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
