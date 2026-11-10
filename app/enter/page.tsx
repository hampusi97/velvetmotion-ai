"use client";

import { useState } from "react";
import { AgeGate, LeftScreen } from "@/components/age-gate";

export default function EnterPage() {
  const [left, setLeft] = useState(false);
  if (left) return <LeftScreen />;

  return (
    <AgeGate
      onEnter={() => {
        document.cookie = "velvet-age-ok=yes; Path=/; Max-Age=31536000; SameSite=Lax";
        const next = new URLSearchParams(window.location.search).get("next");
        const destination = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") && !next.includes("://") && !next.startsWith("/enter")
          ? next
          : "/";
        window.location.assign(destination);
      }}
      onLeave={() => setLeft(true)}
    />
  );
}
