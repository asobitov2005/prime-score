import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/internal-api/",
          "/dashboard",
          "/history",
          "/settings",
          "/subscription",
          "/attempts/",
          "/writing/history",
          "/writing/submissions/",
          "/writing/tasks/",
          "/exam-preview/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
