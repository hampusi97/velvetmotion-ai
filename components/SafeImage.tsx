"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { staticPortraitUrl } from "@/lib/portraitFallback";

const DEFAULT_SAFE_FALLBACK = "/portraits/nova.jpg";

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
  const [resolvedSrc, setResolvedSrc] = useState(src || effectiveFallback || DEFAULT_SAFE_FALLBACK);
  const [fallbackApplied, setFallbackApplied] = useState(false);

  useEffect(() => {
    setResolvedSrc(src || effectiveFallback || DEFAULT_SAFE_FALLBACK);
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
