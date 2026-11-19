import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), payment=(), usb=(), camera=(self), microphone=(self)",
  },
];

export default function nextConfig(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    output: "standalone",
    poweredByHeader: false,
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
          headers: SECURITY_HEADERS,
        },
      ];
    },
  };
}
