import type { Metadata } from "next";
import { LandingPageClient } from "@/components/marketing/landing-page-client";
import { getLandingOnlineCount } from "@/lib/server-live-stats";
import { getPublicPlans } from "@/lib/server-plans";
import { getPublicReviews } from "@/lib/server-reviews";
import { getCatalogTests } from "@/lib/server-data";
import {
  absoluteUrl,
  buildFaqStructuredData,
  buildLandingWebPageStructuredData,
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  defaultOgImage,
  landingKeywords,
} from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Free IELTS Mock Tests Online | Reading, Listening, Writing & Speaking",
  description:
    "Prepare for IELTS online with free mock tests, Reading and Listening practice, Writing feedback, Speaking mock preparation, answer review, and band score improvement on PrimeScore.",
  keywords: landingKeywords,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    title: "Free IELTS Mock Tests Online | PrimeScore",
    description:
      "Practice IELTS mock tests online with Reading, Listening, Writing feedback, Speaking preparation, and computer-delivered exam simulation on PrimeScore.",
    images: [
      {
        url: absoluteUrl(defaultOgImage),
        width: 1088,
        height: 944,
        alt: "PrimeScore IELTS mock test online platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free IELTS Mock Tests Online | PrimeScore",
    description:
      "Train for IELTS Academic with online mock tests for Reading, Listening, Writing, and Speaking preparation on PrimeScore.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

const structuredDataBlocks = [
  buildOrganizationStructuredData(),
  buildWebsiteStructuredData(),
  buildLandingWebPageStructuredData(),
  buildFaqStructuredData(),
];

export default async function LandingPage() {
  const [plans, reviews, onlineCount, allTests] = await Promise.all([
    getPublicPlans(),
    getPublicReviews(6),
    getLandingOnlineCount(),
    getCatalogTests().catch(() => []),
  ]);

  const featuredTests = allTests.filter((t) => t.status === "published").map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    source: t.source,
    questionCount: t.questionCount,
    estimatedMinutes: t.estimatedMinutes,
    isPremiumLocked: t.accessType === "premium",
  }));

  return (
    <>
      {structuredDataBlocks.map((payload, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}

      <LandingPageClient plans={plans} reviews={reviews} onlineCount={onlineCount} initialTests={featuredTests} />
    </>
  );
}
