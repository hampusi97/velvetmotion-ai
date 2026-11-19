import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://velvetmotion-ai.hampusi97.workers.dev";
const ROUTES = ["", "/discover/", "/chat/", "/group/", "/shorts/", "/collection/", "/create/", "/studio/", "/download/", "/terms/", "/privacy/", "/policy/"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((route, index) => ({
    url: `${BASE}${route}`,
    lastModified: now,
    changeFrequency: index < 8 ? "daily" : "monthly",
    priority: index === 0 ? 1 : index < 8 ? 0.85 : 0.4,
  }));
}
