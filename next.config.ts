import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.SITES_STATIC_EXPORT === "1" ? "export" : "standalone",
  images: {
    unoptimized: process.env.SITES_STATIC_EXPORT === "1",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
