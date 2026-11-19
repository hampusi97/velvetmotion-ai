import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    output: "export",
    trailingSlash: true,
    images: {
      unoptimized: true,
      remotePatterns: [
        { protocol: "https", hostname: "image.pollinations.ai" },
        { protocol: "https", hostname: "images.unsplash.com" },
        { protocol: "https", hostname: "**" },
      ],
    },
  };
}
