import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://velvetmotion-ai.pages.dev",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
