import type { Metadata } from "next";
import { LandingPageClient } from "@/components/marketing/landing-page-client";
import { getPublicPlans } from "@/lib/server-plans";
import { getPublicReviews } from "@/lib/server-reviews";
import {
  absoluteUrl,
  buildFaqStructuredData,
  buildLandingWebPageStructuredData,
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  defaultOgImage,
  landingKeywords,
} from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Free IELTS Reading & Listening Practice Tests Online",
  description:
    "Prepare for IELTS Academic with free Reading and Listening practice tests, computer-delivered mock exams, answer review, vocabulary-focused study, and band score improvement on PrimeScore.",
  keywords: landingKeywords,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    title: "Free IELTS Reading & Listening Practice Tests Online | PrimeScore",
    description:
      "Practice IELTS Reading and Listening online with free mock tests, vocabulary-rich review, and computer-delivered exam simulation on PrimeScore.",
    images: [
      {
        url: absoluteUrl(defaultOgImage),
        width: 1088,
        height: 944,
        alt: "PrimeScore IELTS Reading and Listening practice platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free IELTS Reading & Listening Practice Tests Online | PrimeScore",
    description:
      "Train for IELTS Academic with Reading and Listening mock tests, answer review, and computer-delivered practice on PrimeScore.",
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
  const [plans, reviews] = await Promise.all([
    getPublicPlans(),
    getPublicReviews(6),
  ]);

  return (
    <>
      {structuredDataBlocks.map((payload, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}

      <LandingPageClient plans={plans} reviews={reviews} />
    </>
  );
}
