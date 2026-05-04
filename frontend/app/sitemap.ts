import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { seoLandingPages } from "@/lib/seo-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const publicRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/reviews"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/tests"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];

  const seoRoutes: MetadataRoute.Sitemap = seoLandingPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified,
    changeFrequency: "weekly",
    priority: page.slug === "ielts-mock-test-online" ? 0.95 : 0.86,
  }));

  return [...publicRoutes, ...seoRoutes];
}
