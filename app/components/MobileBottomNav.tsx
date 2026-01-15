// app/components/MobileBottomNav.tsx
"use client";

import BottomNav from "./BottomNav";

export default function MobileBottomNav() {
  return (
    <div className="mobile-only-bottomnav">
      <BottomNav isMobile={true} />
    </div>
  );
}
