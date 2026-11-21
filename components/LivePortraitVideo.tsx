"use client";

import React, { useState } from "react";
import { SafeImage } from "@/components/SafeImage";

const FALLBACK_PORTRAIT = "/portraits/nova.jpg";

/**
 * Maps verified portrait paths and companion IDs to their 1-to-1 seamless H.264 `.mp4` video loops
 * in `/public/videos/` so every card plays the exact matching companion face in motion.
 */
const PORTRAIT_TO_VIDEO: Record<string, string> = {
  "/portraits/chloe.jpg": "/videos/chloe.mp4",
  "/portraits/priya-v.jpg": "/videos/priya.mp4",
  "/portraits/elena.jpg": "/videos/elena.mp4",
  "/portraits/delilah-v.jpg": "/videos/delilah.mp4",
  "/portraits/suzu-m.jpg": "/videos/suzu.mp4",
  "/portraits/mia.jpg": "/videos/mia.mp4",
  "/portraits/scarlett.jpg": "/videos/scarlett.mp4",
  "/portraits/freya.jpg": "/videos/freya.mp4",
  "/portraits/valentina.jpg": "/videos/valentina.mp4",
  "/portraits/mila-s.jpg": "/videos/mila.mp4",
  "/portraits/nova.jpg": "/videos/nova.mp4",
  "/portraits/sloane.jpg": "/videos/sloane.mp4",
  "/portraits/raven.jpg": "/videos/raven.mp4",
  "/portraits/chloe-parker.webp": "/videos/chloe-parker.mp4",
  "/portraits/maya-solis.webp": "/videos/maya-solis.mp4",
  "/portraits/sloane-kensington.webp": "/videos/sloane-kensington.mp4",
  "/portraits/raven-vance.webp": "/videos/raven-vance.mp4",
  "/portraits/sora-takahashi.webp": "/videos/sora-takahashi.mp4",
  "/portraits/dalia-moreau.webp": "/videos/dalia-moreau.mp4",
  "/portraits/lena-brooks.webp": "/videos/lena-brooks.mp4",
  "/portraits/aria-velasco.webp": "/videos/aria-velasco.mp4",
  "/portraits/nova-park.webp": "/videos/nova-park.mp4",
  "/portraits/nadine-okoye.webp": "/videos/nadine-okoye.mp4",
  "/portraits/claire-bennett.webp": "/videos/claire-bennett.mp4",
  "/portraits/yumi-chen.webp": "/videos/yumi-chen.mp4",
};

const ID_TO_VIDEO: Record<string, string> = {
  chloe: "/videos/chloe.mp4",
  priya: "/videos/priya.mp4",
  elena: "/videos/elena.mp4",
  delilah: "/videos/delilah.mp4",
  suzu: "/videos/suzu.mp4",
  mia: "/videos/mia.mp4",
  scarlett: "/videos/scarlett.mp4",
  freya: "/videos/freya.mp4",
  valentina: "/videos/valentina.mp4",
  mila: "/videos/mila.mp4",
  nova: "/videos/nova.mp4",
  sloane: "/videos/sloane.mp4",
  raven: "/videos/raven.mp4",
  "chloe-parker": "/videos/chloe-parker.mp4",
  "maya-solis": "/videos/maya-solis.mp4",
  "sloane-kensington": "/videos/sloane-kensington.mp4",
  "raven-vance": "/videos/raven-vance.mp4",
  "sora-takahashi": "/videos/sora-takahashi.mp4",
  "dalia-moreau": "/videos/dalia-moreau.mp4",
  "lena-brooks": "/videos/lena-brooks.mp4",
  "aria-velasco": "/videos/aria-velasco.mp4",
  "nova-park": "/videos/nova-park.mp4",
  "nadine-okoye": "/videos/nadine-okoye.mp4",
  "claire-bennett": "/videos/claire-bennett.mp4",
  "yumi-chen": "/videos/yumi-chen.mp4",
};

export function resolveLiveVideoUrl(portraitSrc?: string, companionId?: string): string | null {
  const cleanSrc = (portraitSrc || "").trim();
  if (cleanSrc && PORTRAIT_TO_VIDEO[cleanSrc]) {
    return PORTRAIT_TO_VIDEO[cleanSrc];
  }
  const cleanId = (companionId || "").trim().toLowerCase();
  if (cleanId && ID_TO_VIDEO[cleanId]) {
    return ID_TO_VIDEO[cleanId];
  }
  return null;
}

function hashPhaseDelay(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const delaySec = -((Math.abs(h) % 50) / 10);
  return `${delaySec.toFixed(1)}s`;
}

export function LivePortraitVideo({
  src,
  alt,
  companionId,
  videoUrl,
  className = "",
}: {
  src: string;
  alt: string;
  companionId?: string;
  videoUrl?: string | null;
  className?: string;
}) {
  const resolvedVideo = videoUrl ?? resolveLiveVideoUrl(src, companionId);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const delay = hashPhaseDelay(companionId || src || alt);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ ["--vm-live-delay" as string]: delay }}
    >
      <SafeImage
        src={src || FALLBACK_PORTRAIT}
        fallbackSrc={FALLBACK_PORTRAIT}
        alt={alt}
        loading="lazy"
        className="vm-live-video-loop h-full w-full object-cover object-top transition duration-700 group-hover:scale-110"
      />

      {resolvedVideo && !videoFailed && (
        <video
          poster={src || FALLBACK_PORTRAIT}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onPlaying={() => setVideoPlaying(true)}
          onLoadedData={() => setVideoPlaying(true)}
          onError={() => setVideoFailed(true)}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 group-hover:scale-105 ${
            videoPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={resolvedVideo.replace(/\.mp4$/i, ".webm")} type="video/webm" />
          <source src={resolvedVideo} type="video/mp4" />
        </video>
      )}

      {/* Subtle warm camera light pulse overlay so every portrait feels like a live feed */}
      <div
        aria-hidden="true"
        className="vm-live-light-sweep pointer-events-none absolute inset-0"
      />
    </div>
  );
}
