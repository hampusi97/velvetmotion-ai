import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    output: "export",
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "image.pollinations.ai" },
        { protocol: "https", hostname: "images.unsplash.com" },
        { protocol: "https", hostname: "**" },
      ],
      unoptimized: true,
    },
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ],
        },
      ];
    },
  };
}
