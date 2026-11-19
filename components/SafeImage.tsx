"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { staticPortraitUrl } from "@/lib/portraitFallback";

const DEFAULT_SAFE_FALLBACK = "/portraits/nova.jpg";

function sanitizeImageSrc(candidate: string | undefined, fallback: string): string {
  const trimmed = (candidate || "").trim();
  if (!trimmed) return fallback;
  const lower = trimmed.toLowerCase();
  if (lower.includes("/avatars/") || lower.startsWith("data:image/svg+xml") || /\.svg(?:$|[?#])/i.test(lower)) {
    return fallback;
  }
  return trimmed;
}

export function SafeImage({
  src,
  alt,
  fallbackSrc,
  fallbackId,
  onError,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fallbackSrc?: string;
  fallbackId?: string;
}) {
  const rawFallback = fallbackSrc || (fallbackId ? staticPortraitUrl(fallbackId) : DEFAULT_SAFE_FALLBACK);
  const effectiveFallback = sanitizeImageSrc(rawFallback, DEFAULT_SAFE_FALLBACK);
  const [resolvedSrc, setResolvedSrc] = useState(() => sanitizeImageSrc(src, effectiveFallback));
  const [fallbackApplied, setFallbackApplied] = useState(false);

  useEffect(() => {
    setResolvedSrc(sanitizeImageSrc(src, effectiveFallback));
    setFallbackApplied(false);
  }, [src, effectiveFallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={resolvedSrc}
      alt={alt}
      onError={(e) => {
        if (!fallbackApplied && resolvedSrc !== effectiveFallback) {
          setFallbackApplied(true);
          setResolvedSrc(effectiveFallback);
        } else if (resolvedSrc !== DEFAULT_SAFE_FALLBACK) {
          setFallbackApplied(true);
          setResolvedSrc(DEFAULT_SAFE_FALLBACK);
        }
        onError?.(e);
      }}
    />
  );
}
