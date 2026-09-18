import type { Metadata } from "next";
import { LandingPage as LandingContent } from "@/components/marketing/landing-page";
import { getPublicPlans } from "@/lib/server-plans";
import { getLandingFeaturedTests } from "@/lib/server-data";
import {
  absoluteUrl,
  buildFaqStructuredData,
  buildLandingPracticeItemListStructuredData,
  buildLandingWebPageStructuredData,
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  defaultOgImage,
  landingKeywords,
} from "@/lib/seo";

export const revalidate = 900;

export const metadata: Metadata = {
  title:
    "Free IELTS Mock Tests Online | Reading, Listening, Writing & Speaking",
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

export default async function LandingPage() {
  const [plans, allTests] = await Promise.all([
    getPublicPlans({ revalidate: 300 }),
    getLandingFeaturedTests(),
  ]);

  const publishedTests = allTests.filter((t) => t.status === "published");
  const candidates = publishedTests.filter(
    (test) =>
      test.slug &&
      test.slug !== test.id &&
      (test.type === "reading" || test.type === "listening"),
  );
  // Mix both skills and prefer free content. Selection uses catalog metadata only.
  const bySkill = ["reading", "listening"].map((type) =>
    candidates
      .filter((test) => test.type === type)
      .sort(
        (a, b) =>
          Number(a.accessType === "premium") -
          Number(b.accessType === "premium"),
      ),
  );
  const featuredTests = Array.from({ length: 3 }, (_, index) =>
    bySkill.map((items) => items[index]),
  )
    .flat()
    .filter((test): test is (typeof candidates)[number] => Boolean(test))
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      type: t.type,
      source: t.source,
      questionCount: t.questionCount,
      estimatedMinutes: t.estimatedMinutes,
      isPremiumLocked: t.accessType === "premium",
      createdAt: t.createdAt,
    }));
  const structuredDataBlocks = [
    buildOrganizationStructuredData(),
    buildWebsiteStructuredData(),
    buildLandingWebPageStructuredData(),
    buildFaqStructuredData(),
    buildLandingPracticeItemListStructuredData(featuredTests),
  ];

  return (
    <>
      {structuredDataBlocks.map((payload, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <LandingContent
        plans={plans}
        tests={featuredTests}
        publishedCount={publishedTests.length}
      />
    </>
  );
}
