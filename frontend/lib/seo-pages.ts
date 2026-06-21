import type { Metadata } from "next";

import {
  absoluteUrl,
  defaultOgImage,
  landingKeywords,
  siteName,
} from "@/lib/seo";

export type SeoLandingPage = {
  slug: string;
  path: string;
  metaTitle: string;
  metaDescription?: string;
  title: string;
  description: string;
  badge: string;
  lead: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
  highlights: string[];
  sections: Array<{
    title: string;
    body: string;
  }>;
  benefits: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  searchIntents: string[];
  keywords: string[];
  relatedSlugs: string[];
};

export const onlineIeltsKeywords = [
  "IELTS mock test online",
  "IELTS mock online",
  "online IELTS mock platform",
  "IELTS mock platform",
  "IELTS online mock test Uzbekistan",
  "IELTS mock test Uzbekistan",
  "IELTS mock test Tashkent online",
  "Tashkent IELTS mock online",
  "IELTS mock Tashkent",
  "IELTS speaking mock online",
  "online speaking mock IELTS",
  "IELTS reading mock online",
  "IELTS listening mock online",
  "IELTS writing mock online",
  "IELTS writing checker online",
  "computer delivered IELTS mock test",
  "IELTS band score online",
  "ielts mock online uzbekistan",
  "ielts mock online tashkent",
  "ielts speaking mock online uzbekistan",
  "ielts writing checker uzbekistan",
  "ielts reading mock test online",
  "ielts listening mock test online",
  "ielts online platform",
  "IELST mock online",
  "tashklent ielts mock",
];

// Standalone SEO landing routes were consolidated into the main homepage.
export const seoLandingPages: SeoLandingPage[] = [];

const seoLandingPageBySlug = new Map(seoLandingPages.map((page) => [page.slug, page]));

export function getSeoLandingPage(slug: string) {
  return seoLandingPageBySlug.get(slug) ?? null;
}

export function getRelatedSeoPages(page: SeoLandingPage) {
  return page.relatedSlugs
    .map((slug) => getSeoLandingPage(slug))
    .filter((item): item is SeoLandingPage => Boolean(item));
}

export function buildSeoPageMetadata(slug: string): Metadata {
  const page = getSeoLandingPage(slug);
  if (!page) {
    return {};
  }

  const keywords = Array.from(
    new Set([...landingKeywords, ...onlineIeltsKeywords, ...page.keywords]),
  );
  const description = page.metaDescription ?? page.description;

  return {
    title: page.metaTitle,
    description,
    keywords,
    alternates: {
      canonical: absoluteUrl(page.path),
    },
    openGraph: {
      type: "website",
      siteName,
      url: absoluteUrl(page.path),
      title: `${page.metaTitle} | ${siteName}`,
      description,
      images: [
        {
          url: absoluteUrl(defaultOgImage),
          width: 1088,
          height: 944,
          alt: `${siteName} ${page.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.metaTitle} | ${siteName}`,
      description,
      images: [absoluteUrl(defaultOgImage)],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function buildSeoWebPageStructuredData(page: SeoLandingPage) {
  const description = page.metaDescription ?? page.description;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl(`${page.path}#webpage`),
    url: absoluteUrl(page.path),
    name: page.title,
    description,
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    primaryImageOfPage: absoluteUrl(defaultOgImage),
    inLanguage: "en",
    about: page.keywords,
    audience: {
      "@type": "Audience",
      audienceType: "IELTS learners in Uzbekistan and online learners worldwide",
    },
  };
}

export function buildSeoFaqStructuredData(page: SeoLandingPage) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildSeoWebApplicationStructuredData(page: SeoLandingPage) {
  const description = page.metaDescription ?? page.description;

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": absoluteUrl(`${page.path}#app`),
    name: `${siteName} online IELTS mock platform`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: absoluteUrl(page.path),
    description,
    offers: {
      "@type": "Offer",
      category: "Education",
      url: absoluteUrl("/#pricing"),
      priceCurrency: "UZS",
    },
  };
}
