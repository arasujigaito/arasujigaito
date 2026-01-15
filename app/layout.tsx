import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MobileBottomNav from "./components/MobileBottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "あらすじ街灯",
  description: "物語のあらすじを投稿・発見する場所",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          minHeight: "100vh",
          backgroundColor: "#0b1220",
        }}
      >
        {/* ✅ 背景レイヤ（全ページ共通） */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0, // ✅ -1 をやめる（これが超重要）
            backgroundImage: "url('/hero-night-road.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        />

        {/* ✅ コンテンツは必ず背景より手前 */}
        <div
          className="page-with-bottomnav"
          style={{
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            background: "transparent",
          }}
        >
          {children}
        </div>

        {/* ✅ スマホだけ表示される下バー（ホーム/投稿/マイページ/通知） */}
        <MobileBottomNav />
      </body>
    </html>
  );
}
