"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { staticPortraitUrl } from "@/lib/portraitFallback";

const DEFAULT_SAFE_FALLBACK = "/portraits/chloe-parker.webp";

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
  const effectiveFallback = fallbackSrc || (fallbackId ? staticPortraitUrl(fallbackId) : DEFAULT_SAFE_FALLBACK);
  const [resolvedSrc, setResolvedSrc] = useState(src || effectiveFallback);
  const [fallbackApplied, setFallbackApplied] = useState(false);

  useEffect(() => {
    setResolvedSrc(src || effectiveFallback);
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
        }
        onError?.(e);
      }}
    />
  );
}
