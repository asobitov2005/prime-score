import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { seoLandingPages } from "@/lib/seo-pages";
import { getLandingFeaturedTests } from "@/lib/server-data";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const publicRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/tests"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/login"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const seoRoutes: MetadataRoute.Sitemap = seoLandingPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.86,
  }));

  const testRoutes: MetadataRoute.Sitemap = (await getLandingFeaturedTests())
    .filter((test) => test.status === "published")
    .map((test) => ({
      url: absoluteUrl(`/tests/${test.slug}`),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.72,
    }));

  return [...publicRoutes, ...seoRoutes, ...testRoutes];
}
