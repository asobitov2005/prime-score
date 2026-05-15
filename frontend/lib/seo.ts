import type { Metadata } from "next";

export const siteName = "PrimeScore";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://primescore.uz").replace(/\/$/, "");
export const defaultOgImage = "/logo.jpg";
export const defaultSiteIcon = "/logo-light.svg";

export const brandAliases = [
  "Prime Score",
  "PrimeScore.uz",
  "Prime Score UZ",
  "PrimeScore Uzbekistan",
];

export const landingKeywords = [
  "IELTS mock test",
  "IELTS mock test online",
  "IELTS mock online",
  "IELTS mock platform",
  "IELTS mock test Uzbekistan",
  "IELTS mock test Tashkent online",
  "Tashkent IELTS mock online",
  "IELTS practice test free",
  "IELTS reading practice",
  "IELTS reading practice test",
  "IELTS reading mock online",
  "IELTS reading mock platform",
  "IELTS academic reading practice",
  "IELTS listening practice",
  "IELTS listening practice test",
  "IELTS listening mock online",
  "IELTS listening mock platform",
  "IELTS academic listening practice",
  "IELTS writing mock online",
  "IELTS writing checker online",
  "IELTS writing Task 1 feedback",
  "IELTS writing Task 2 feedback",
  "IELTS speaking mock online",
  "speaking mock online IELTS",
  "computer-delivered IELTS practice",
  "IELTS vocabulary practice",
  "English learning for IELTS",
  "English listening practice",
  "IELTS band score practice",
  "IELTS preparation online",
  "PrimeScore",
  "PrimeScore.uz",
  "Prime Score",
  "IELTS Uzbekistan",
  "IELTS Tashkent online",
  "ielts tayyorlov",
  "ielts mock online uzbekistan",
  "ielts mock tashkent",
  "ielts speaking mock online",
  "ielts writing checker",
  "ielts reading mashqlari",
  "ielts listening mashqlari",
  "ingliz tili ielts",
];

export const pricingKeywords = [
  ...landingKeywords,
  "IELTS pricing",
  "IELTS subscription",
  "IELTS premium plans",
  "IELTS course price",
  "IELTS preparation pricing",
  "IELTS mock test subscription",
  "PrimeScore pricing",
  "Prime Score pricing",
  "PrimeScore premium",
  "ielts narx",
  "ielts premium narx",
  "ingliz tili ielts narx",
];

export const landingFaqs = [
  {
    question: "What can I practice on PrimeScore?",
    answer:
      "PrimeScore is an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation, with exam-style practice, writing feedback, review tools, and band-score focused study.",
  },
  {
    question: "Is PrimeScore useful for computer-delivered IELTS preparation?",
    answer:
      "Yes. PrimeScore is designed around a computer-delivered IELTS workflow so learners can practice Reading, Listening, Writing, and Speaking preparation online.",
  },
  {
    question: "Does PrimeScore help with IELTS Writing and Speaking mock preparation?",
    answer:
      "Yes. PrimeScore includes Writing practice with custom topics and feedback, and provides a dedicated route for Speaking mock online preparation inside the IELTS platform.",
  },
  {
    question: "Can students in Uzbekistan or Tashkent use PrimeScore for IELTS mock online?",
    answer:
      "Yes. PrimeScore is fully online for IELTS learners in Uzbekistan, Tashkent, and beyond who want structured IELTS mock practice without relying on a physical mock center schedule.",
  },
  {
    question: "Are there free IELTS practice tests on PrimeScore?",
    answer:
      "Yes. PrimeScore includes free access content and premium practice options so learners can start IELTS mock preparation online and upgrade when they need deeper review.",
  },
];

export const pricingFaqs = [
  {
    question: "What is included in PrimeScore Premium?",
    answer:
      "PrimeScore Premium unlocks premium IELTS mock practice depth, including Reading and Listening tests, detailed answer explanations, and a longer-term study path for consistent online preparation.",
  },
  {
    question: "Can I use PrimeScore for free before upgrading?",
    answer:
      "Yes. PrimeScore keeps public IELTS mock practice available so learners can start free before choosing a premium plan.",
  },
  {
    question: "Do PrimeScore plans renew automatically?",
    answer:
      "No. PrimeScore uses one-time plans. If you want to continue after your plan ends, you choose and purchase another plan manually.",
  },
  {
    question: "Is PrimeScore suitable for IELTS students in Uzbekistan?",
    answer:
      "Yes. PrimeScore is designed for IELTS learners in Uzbekistan and other markets who want structured IELTS mock online preparation.",
  },
];

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteUrl}/`).toString();
}

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

export function buildPricingWebPageStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl("/pricing#webpage"),
    url: absoluteUrl("/pricing"),
    name: "PrimeScore Pricing for IELTS Mock Online Practice",
    description:
      "Compare PrimeScore one-time pricing plans for IELTS mock online practice, Reading and Listening tests, Writing feedback, premium tests, and answer explanations.",
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    primaryImageOfPage: absoluteUrl(defaultOgImage),
    inLanguage: "en",
    about: [
      "IELTS pricing",
      "IELTS premium plans",
      "IELTS mock online subscription",
      "IELTS Reading and Listening subscription",
      "IELTS Writing feedback subscription",
      "PrimeScore pricing",
    ],
  };
}

export function buildPricingFaqStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pricingFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildPricingOfferCatalogStructuredData(
  plans: Array<{
    title: string;
    durationDays: number;
    numericPrice: number;
    currency: string;
  }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": absoluteUrl("/pricing#offers"),
    name: "PrimeScore pricing plans",
    itemListElement: plans.map((plan, index) => ({
      "@type": "Offer",
      position: index + 1,
      name: `${plan.title} PrimeScore plan`,
      description: `One-time ${plan.durationDays}-day PrimeScore plan for IELTS mock online practice.`,
      price: Number.isFinite(plan.numericPrice) ? plan.numericPrice.toFixed(0) : "0",
      priceCurrency: plan.currency,
      url: absoluteUrl("/pricing"),
      category: "Education",
    })),
  };
}

export function buildBreadcrumbStructuredData(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
