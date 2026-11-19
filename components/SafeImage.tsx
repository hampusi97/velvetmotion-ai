"use client";

import { useState } from "react";

const FALLBACKS = [
  "/portraits/chloe.jpg",
  "/portraits/elena.jpg",
  "/portraits/aria.jpg",
  "/portraits/sienna.jpg",
  "/portraits/mia.jpg",
];

export function SafeImage({
  src,
  alt = "",
  className = "",
  fallbackId,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackId?: string }) {
  const [failed, setFailed] = useState(false);
  const fb = FALLBACKS[(fallbackId || "").length % FALLBACKS.length];
  const url = failed || !src ? fb : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
