import { Metadata } from "./seo-dependencies";
import { absoluteUrl, brandAliases, defaultOgImage, defaultSiteIcon, landingFaqs, landingKeywords, siteName, siteUrl } from "./seo-part-01";

export function buildDefaultMetadata(): Metadata {
  const description =
    "PrimeScore is an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation with free mock tests, writing feedback, answer review, and band score focused practice.";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "PrimeScore | IELTS Mock Test Online Platform",
      template: "%s | PrimeScore",
    },
    description,
    applicationName: siteName,
    keywords: landingKeywords,
    alternates: {
      canonical: absoluteUrl("/"),
    },
    category: "education",
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    icons: {
      icon: [{ url: defaultSiteIcon, type: "image/svg+xml" }],
      shortcut: [{ url: defaultSiteIcon, type: "image/svg+xml" }],
      apple: defaultOgImage,
    },
    openGraph: {
      type: "website",
      siteName,
      url: absoluteUrl("/"),
      title: "PrimeScore | IELTS Mock Test Online Platform",
      description,
      images: [
        {
          url: absoluteUrl(defaultOgImage),
          width: 1088,
          height: 944,
          alt: "PrimeScore IELTS practice platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "PrimeScore | IELTS Mock Test Online Platform",
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

export function buildOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteName,
    alternateName: brandAliases,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.jpg"),
    description:
      "PrimeScore is an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation for learners in Uzbekistan and worldwide.",
    areaServed: ["UZ", "Worldwide"],
    keywords: landingKeywords,
  };
}

export function buildWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteName,
    alternateName: brandAliases,
    url: absoluteUrl("/"),
    description:
      "PrimeScore provides IELTS mock tests online, Writing feedback, Speaking preparation, review tools, and computer-delivered exam preparation.",
    inLanguage: "en",
    publisher: {
      "@id": absoluteUrl("/#organization"),
    },
    keywords: landingKeywords,
  };
}

export function buildLandingWebPageStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl("/#webpage"),
    url: absoluteUrl("/"),
    name: "Free IELTS Mock Tests Online for Reading, Listening, Writing and Speaking",
    description:
      "Practice IELTS online with Reading mock tests, Listening mock tests, Writing feedback, Speaking preparation, vocabulary-focused review, and computer-delivered exam simulation on PrimeScore.",
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    primaryImageOfPage: absoluteUrl(defaultOgImage),
    inLanguage: "en",
    about: [
      "IELTS Reading practice",
      "IELTS Listening practice",
      "IELTS Writing practice",
      "IELTS Speaking mock online",
      "IELTS mock tests online",
      "IELTS mock test Uzbekistan",
      "IELTS mock test Tashkent online",
      "IELTS vocabulary practice",
      "English learning for IELTS",
    ],
  };
}

export function buildFaqStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landingFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildLandingPracticeItemListStructuredData(
  tests: Array<{
    id: string;
    slug?: string;
    title: string;
    type: string;
    source?: string;
    questionCount?: number;
    estimatedMinutes?: number;
  }>,
) {
  const testPath = (test: { id: string; slug?: string }) => `/tests/${test.slug ?? test.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": absoluteUrl("/#featured-tests"),
    name: "Featured IELTS practice tests on PrimeScore",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: tests.length,
    itemListElement: tests.map((test, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(testPath(test)),
      item: {
        "@type": "LearningResource",
        "@id": absoluteUrl(`${testPath(test)}#learning-resource`),
        name: test.title,
        url: absoluteUrl(testPath(test)),
        learningResourceType: `${test.type} IELTS practice test`,
        educationalLevel: "IELTS",
        about: [
          "IELTS mock test",
          `IELTS ${test.type} practice`,
          test.source ? `${test.source} IELTS practice` : "online IELTS practice",
        ].filter(Boolean),
        timeRequired: test.estimatedMinutes ? `PT${test.estimatedMinutes}M` : undefined,
        numberOfItems: test.questionCount,
        provider: {
          "@id": absoluteUrl("/#organization"),
        },
      },
    })),
  };
}
