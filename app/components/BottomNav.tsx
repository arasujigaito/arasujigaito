// app/components/BottomNav.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase";

type Props = {
  isMobile: boolean;
};

type TabKey = "home" | "post" | "mypage" | "notice";

export default function BottomNav({ isMobile }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // ✅ hooks は常に呼ぶ（isMobileで早期returnしない）
  const current: TabKey = useMemo(() => {
    const path = pathname || "/";
    if (path.startsWith("/post")) return "post";
    if (path.startsWith("/mypage")) return "mypage";
    if (path.startsWith("/notifications")) return "notice";
    return "home";
  }, [pathname]);

  // ✅ マイページ枠を「ログイン/マイページ」に差し替え（キーはmypageのまま）
  const myPageLabel = user ? "マイページ" : "ログイン";
  const myPageIcon = user ? "👤" : "🔑";
  const myPageHref = user ? "/mypage" : "/login";

  const items: {
    key: TabKey;
    label: string;
    icon: string;
    href: string;
  }[] = [
    { key: "home", label: "ホーム", icon: "🏠", href: "/" },
    { key: "post", label: "投稿", icon: "📝", href: "/post/new" },
    { key: "mypage", label: myPageLabel, icon: myPageIcon, href: myPageHref },
    { key: "notice", label: "通知", icon: "🔔", href: "/notifications" },
  ];

  // ✅ 追加：押下時の遷移をここで一括制御（最小変更）
  const handleNav = (key: TabKey, href: string) => {
    // ✅ 未ログインで「投稿」を押したら、警告してログインへ
    if (key === "post" && !user) {
      const ok = window.confirm("投稿するにはログインが必要です。ログインしますか？");
      if (ok) router.push("/login");
      return;
    }
    router.push(href);
  };

  // ✅ ここで return null（hooksの後）
  if (!isMobile) return null;

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: "rgba(5, 12, 30, 0.92)",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(10px)",
      }}
      aria-label="Mobile bottom navigation"
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-around",
          padding: "6px 8px 10px",
        }}
      >
        {items.map((item) => {
          const active = current === item.key;

          return (
            <button
              key={item.key}
              type="button"
              // ✅ ここだけ変更
              onClick={() => handleNav(item.key, item.href)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 0",
                borderRadius: 999,
                border: "none",
                background: active
                  ? "linear-gradient(135deg, rgba(120,213,180,0.35), rgba(81,148,214,0.4))"
                  : "transparent",
                color: active ? "#f9fafb" : "rgba(248,250,252,0.8)",
                fontSize: 11,
                cursor: "pointer",
              }}
              aria-current={active ? "page" : undefined}
              title={item.label}
            >
              <span style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
