import type { Metadata } from "next";

export const siteName = "PrimeScore";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://primescore.uz").replace(/\/$/, "");
export const defaultOgImage = "/logo.jpg";
export const defaultSiteIcon = "/logo.svg";

export const brandAliases = [
  "Prime Score",
  "PrimeScore.uz",
  "Prime Score UZ",
  "PrimeScore Uzbekistan",
];

export const landingKeywords = [
  "IELTS mock test",
  "IELTS mock test online",
  "IELTS practice test free",
  "IELTS reading practice",
  "IELTS reading practice test",
  "IELTS academic reading practice",
  "IELTS listening practice",
  "IELTS listening practice test",
  "IELTS academic listening practice",
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
  "ielts tayyorlov",
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
      "PrimeScore focuses on IELTS Academic Reading and Listening with exam-style question types, timed practice, answer review, and band-score focused study.",
  },
  {
    question: "Is PrimeScore useful for computer-delivered IELTS preparation?",
    answer:
      "Yes. PrimeScore is designed around a computer-delivered IELTS workflow so learners can practice Reading and Listening in an interface that feels close to the real exam.",
  },
  {
    question: "Does PrimeScore help with IELTS vocabulary and English listening?",
    answer:
      "Yes. Learners build vocabulary in context through Reading passages, Listening tasks, answer review, and repeated exposure to academic English patterns.",
  },
  {
    question: "Can students in Uzbekistan use PrimeScore for IELTS preparation?",
    answer:
      "Yes. PrimeScore is available online for IELTS learners in Uzbekistan and beyond who want structured Reading and Listening practice.",
  },
  {
    question: "Are there free IELTS practice tests on PrimeScore?",
    answer:
      "Yes. PrimeScore includes free access content and premium practice options so learners can start with IELTS Reading and Listening preparation immediately.",
  },
];

export const pricingFaqs = [
  {
    question: "What is included in PrimeScore Premium?",
    answer:
      "PrimeScore Premium unlocks premium IELTS Reading and Listening tests, detailed answer explanations, and a longer-term study path for consistent exam practice.",
  },
  {
    question: "Can I use PrimeScore for free before upgrading?",
    answer:
      "Yes. PrimeScore keeps public Reading and Listening practice available so learners can start free before choosing a premium plan.",
  },
  {
    question: "Do PrimeScore plans renew automatically?",
    answer:
      "No. PrimeScore uses one-time plans. If you want to continue after your plan ends, you choose and purchase another plan manually.",
  },
  {
    question: "Is PrimeScore suitable for IELTS students in Uzbekistan?",
    answer:
      "Yes. PrimeScore is designed for IELTS learners in Uzbekistan and other markets who want structured online Reading and Listening preparation.",
  },
];

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteUrl}/`).toString();
}

export function buildDefaultMetadata(): Metadata {
  const description =
    "PrimeScore is an IELTS Academic Reading and Listening practice platform with free mock tests, computer-delivered practice, answer review, and focused band score preparation.";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "PrimeScore | IELTS Reading & Listening Practice Platform",
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
      icon: defaultSiteIcon,
      shortcut: defaultSiteIcon,
      apple: defaultSiteIcon,
    },
    openGraph: {
      type: "website",
      siteName,
      url: absoluteUrl("/"),
      title: "PrimeScore | IELTS Reading & Listening Practice Platform",
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
      title: "PrimeScore | IELTS Reading & Listening Practice Platform",
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
      "PrimeScore is an IELTS Academic Reading and Listening practice platform for learners in Uzbekistan and worldwide.",
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
      "PrimeScore provides IELTS Reading and Listening practice tests, review tools, and computer-delivered exam preparation.",
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
    name: "Free IELTS Reading and Listening Practice Tests Online",
    description:
      "Practice IELTS Academic Reading and Listening online with mock tests, vocabulary-focused review, and computer-delivered exam simulation on PrimeScore.",
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    primaryImageOfPage: absoluteUrl(defaultOgImage),
    inLanguage: "en",
    about: [
      "IELTS Reading practice",
      "IELTS Listening practice",
      "IELTS mock tests online",
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

export function buildPricingWebPageStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl("/pricing#webpage"),
    url: absoluteUrl("/pricing"),
    name: "PrimeScore Pricing for IELTS Reading and Listening Practice",
    description:
      "Compare PrimeScore one-time pricing plans for IELTS Academic Reading and Listening practice, premium tests, and answer explanations.",
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    primaryImageOfPage: absoluteUrl(defaultOgImage),
    inLanguage: "en",
    about: [
      "IELTS pricing",
      "IELTS premium plans",
      "IELTS Reading and Listening subscription",
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
      description: `One-time ${plan.durationDays}-day PrimeScore plan for IELTS Reading and Listening practice.`,
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
