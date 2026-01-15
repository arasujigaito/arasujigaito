// app/components/NotificationBell.tsx
"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

type Props = {
  user: User | null;
  onClick?: () => void;
};

export default function NotificationBell({ user, onClick }: Props) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("read", "==", false),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snap) => setHasUnread(!snap.empty),
      () => setHasUnread(false)
    );

    return () => unsub();
  }, [user]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="通知"
      title="通知"
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.12)",
        color: "white",
        cursor: "pointer",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        style={{ display: "block", margin: "0 auto" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>

      {hasUnread && (
        <span
          style={{
            position: "absolute",
            top: 7,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "#ff3b30",
            border: "2px solid rgba(11, 18, 32, 0.7)",
          }}
        />
      )}
    </button>
  );
}
