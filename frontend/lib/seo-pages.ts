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

const coreFaqs = [
  {
    question: "Is PrimeScore an online IELTS mock platform?",
    answer:
      "Yes. PrimeScore is built as an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation, with exam-style practice and band-score focused review.",
  },
  {
    question: "Can I use PrimeScore from anywhere?",
    answer:
      "Yes. PrimeScore is fully online, so IELTS learners can practice from home, school, work, or anywhere with internet access.",
  },
  {
    question: "Can I use PrimeScore instead of scheduled classroom mock practice?",
    answer:
      "PrimeScore is useful when you want flexible IELTS mock practice from your laptop or phone, with Reading, Listening, Writing, and Speaking preparation available online.",
  },
];

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "ielts-mock-test-online",
    path: "/ielts-mock-test-online",
    metaTitle: "IELTS Mock Test Online | Reading, Listening, Writing & Speaking",
    title: "IELTS mock test online for full-skill practice",
    metaDescription:
      "Practice IELTS online on PrimeScore with Reading mock tests, Listening mock tests, Writing feedback, Speaking preparation, timed practice, and band-score review for learners in Uzbekistan, Tashkent, and worldwide.",
    description:
      "Practice IELTS online on PrimeScore with Reading mock tests, Listening mock tests, Writing feedback, Speaking preparation, timed practice, and band-score review.",
    badge: "Online IELTS mock platform",
    lead:
      "PrimeScore brings IELTS mock practice online: Reading, Listening, Writing, and Speaking preparation in one focused platform.",
    primaryCta: { label: "Start IELTS mock online", href: "/login" },
    secondaryCta: { label: "Browse practice tests", href: "/tests" },
    highlights: [
      "Reading and Listening mock tests",
      "Writing Task 1 and Task 2 feedback",
      "Speaking mock preparation surface",
      "Built for focused online IELTS prep",
    ],
    sections: [
      {
        title: "One platform for IELTS mock online",
        body:
          "Use PrimeScore when you want an IELTS mock test online instead of waiting for a classroom session. The platform keeps practice, review, and progress in one place.",
      },
      {
        title: "Covers every IELTS skill",
        body:
          "Reading, Listening, Writing, and Speaking each have a dedicated practice path, so learners can focus on one section or train across the full exam.",
      },
      {
        title: "Available whenever you need practice",
        body:
          "Practice IELTS online from home, between lessons, or during a final exam-prep sprint without waiting for a fixed schedule.",
      },
    ],
    benefits: [
      "Practice on your own schedule.",
      "Use computer-delivered style flows for realistic online preparation.",
      "Move from free practice into premium review when exam day gets closer.",
      "Keep Reading, Listening, Writing, and Speaking preparation connected.",
    ],
    faqs: [
      ...coreFaqs,
      {
        question: "Which IELTS sections can I practice online?",
        answer:
          "PrimeScore is structured around IELTS Reading, Listening, Writing, and Speaking preparation, with dedicated pages and workflows for each section.",
      },
    ],
    searchIntents: [
      "Full IELTS mock practice",
      "Reading and Listening tests",
      "Writing feedback",
      "Speaking preparation",
    ],
    keywords: [
      "IELTS mock test online",
      "IELTS mock platform",
      "IELTS mock online Uzbekistan",
      "IELTS mock Tashkent online",
      "IELTS full mock online",
    ],
    relatedSlugs: [
      "ielts-reading-mock-online",
      "ielts-listening-mock-online",
      "ielts-speaking-mock-online",
    ],
  },
  {
    slug: "ielts-mock-test-uzbekistan",
    path: "/ielts-mock-test-uzbekistan",
    metaTitle: "IELTS Mock Test Uzbekistan Online",
    title: "IELTS mock test online for focused preparation",
    metaDescription:
      "Online IELTS mock test platform for students in Uzbekistan: Reading, Listening, Writing feedback, Speaking preparation, timed practice, and band-score focused review.",
    description:
      "Online IELTS mock test platform with Reading, Listening, Writing feedback, Speaking preparation, timed practice, and band-score focused review.",
    badge: "Online IELTS mock platform",
    lead:
      "PrimeScore helps IELTS learners practice online without depending on a fixed classroom timetable.",
    primaryCta: { label: "Start online practice", href: "/login" },
    secondaryCta: { label: "See IELTS pricing", href: "/pricing" },
    highlights: [
      "Online access from anywhere",
      "IELTS Reading and Listening practice",
      "Writing feedback for Task 1 and Task 2",
      "Speaking preparation path",
    ],
    sections: [
      {
        title: "Online IELTS practice on your schedule",
        body:
          "Practice IELTS mock tests online from your own device without travel or fixed appointment times.",
      },
      {
        title: "All key IELTS skills in one place",
        body:
          "Reading, Listening, Writing, and Speaking preparation stay connected in one online platform.",
      },
      {
        title: "Useful before real exam day",
        body:
          "Timed practice and review help learners understand weak sections before they book or attend the official IELTS exam.",
      },
    ],
    benefits: [
      "No classroom schedule required.",
      "Works for students preparing from home.",
      "Keeps all IELTS skills in one account.",
      "Fits short sprint preparation and longer study plans.",
    ],
    faqs: coreFaqs,
    searchIntents: [
      "Online IELTS practice",
      "Reading and Listening mock tests",
      "Writing feedback",
      "Speaking preparation",
    ],
    keywords: [
      "IELTS mock test Uzbekistan",
      "IELTS online mock Uzbekistan",
      "IELTS mock platform Uzbekistan",
      "IELTS preparation online Uzbekistan",
    ],
    relatedSlugs: [
      "ielts-mock-test-tashkent",
      "ielts-mock-test-online",
      "ielts-speaking-mock-online",
    ],
  },
  {
    slug: "ielts-mock-test-tashkent",
    path: "/ielts-mock-test-tashkent",
    metaTitle: "IELTS Mock Test Tashkent Online",
    title: "IELTS mock test online with flexible practice",
    metaDescription:
      "Looking for an IELTS mock test in Tashkent? PrimeScore is an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation from anywhere.",
    description:
      "PrimeScore is an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation from anywhere.",
    badge: "Online IELTS mock practice",
    lead:
      "Practice IELTS online when your schedule allows, with clear paths for each exam section.",
    primaryCta: { label: "Start IELTS mock online", href: "/login" },
    secondaryCta: { label: "Open Reading tests", href: "/tests?type=reading" },
    highlights: [
      "Made for flexible practice",
      "Online IELTS practice from home",
      "Reading, Listening, Writing, Speaking",
      "Clear section-by-section workflow",
    ],
    sections: [
      {
        title: "For students who prefer online practice",
        body:
          "PrimeScore gives you a direct online practice route for full mock preparation and section-by-section improvement.",
      },
      {
        title: "Flexible IELTS preparation online",
        body:
          "Practice from home, after class, or before exam day with an online IELTS mock workflow that stays available when you need it.",
      },
      {
        title: "Section-by-section preparation",
        body:
          "Reading, Listening, Writing, and Speaking are separated clearly, so you can focus on the exact section you need to improve.",
      },
    ],
    benefits: [
      "Practice before or after offline lessons.",
      "Avoid fixed schedules.",
      "Repeat weak sections more often.",
      "Use online review to improve before real IELTS.",
    ],
    faqs: coreFaqs,
    searchIntents: [
      "Flexible online practice",
      "Full IELTS mock",
      "Writing feedback",
      "Speaking preparation",
    ],
    keywords: [
      "IELTS mock test Tashkent",
      "IELTS mock Tashkent online",
      "Tashkent IELTS mock online",
      "IELTS online platform Tashkent",
    ],
    relatedSlugs: [
      "ielts-mock-test-uzbekistan",
      "ielts-mock-test-online",
      "ielts-speaking-mock-online",
    ],
  },
  {
    slug: "ielts-reading-mock-online",
    path: "/ielts-reading-mock-online",
    metaTitle: "IELTS Reading Mock Online | Academic Reading Practice",
    title: "IELTS Reading mock online platform",
    description:
      "Practice IELTS Academic Reading online with mock tests, timed passages, exam-style questions, answer review, and focused online preparation.",
    badge: "Reading mock online",
    lead:
      "Train IELTS Reading online with timed passages, question review, and a computer-delivered practice flow.",
    primaryCta: { label: "Start Reading mock", href: "/tests?type=reading" },
    secondaryCta: { label: "See full IELTS mock", href: "/ielts-mock-test-online" },
    highlights: [
      "Academic Reading mock tests",
      "Timed computer-style practice",
      "Answer review after submission",
      "Useful for focused IELTS learners",
    ],
    sections: [
      {
        title: "IELTS Reading practice that feels exam-focused",
        body:
          "PrimeScore Reading mock tests help learners work through passages, question types, timing pressure, and answer review online.",
      },
      {
        title: "Built for repeat practice",
        body:
          "Reading score improves through repeated exposure to academic vocabulary, passage structure, and question traps.",
      },
      {
        title: "Connected to full IELTS preparation",
        body:
          "Reading is linked with Listening, Writing, and Speaking pages so students can prepare for the whole IELTS exam online.",
      },
    ],
    benefits: [
      "Practice IELTS Reading from your browser.",
      "Review mistakes after finishing.",
      "Use public tests before upgrading.",
      "Prepare for computer-delivered IELTS habits.",
    ],
    faqs: [
      ...coreFaqs,
      {
        question: "Is this for IELTS Academic Reading?",
        answer:
          "Yes. PrimeScore focuses on IELTS Academic-style Reading practice with online mock tests and review.",
      },
    ],
    searchIntents: [
      "Academic Reading practice",
      "Timed passages",
      "Question review",
      "Computer-delivered flow",
    ],
    keywords: [
      "IELTS reading mock online",
      "IELTS reading practice test",
      "Academic IELTS reading mock",
      "IELTS reading online Uzbekistan",
    ],
    relatedSlugs: [
      "ielts-listening-mock-online",
      "ielts-mock-test-online",
    ],
  },
  {
    slug: "ielts-listening-mock-online",
    path: "/ielts-listening-mock-online",
    metaTitle: "IELTS Listening Mock Online | Listening Practice Platform",
    title: "IELTS Listening mock online platform",
    description:
      "Practice IELTS Listening online with mock tests, audio-based tasks, timing, answer review, and focused online IELTS preparation.",
    badge: "Listening mock online",
    lead:
      "Use PrimeScore for IELTS Listening mock practice online, with exam-style tasks and answer review in one flow.",
    primaryCta: { label: "Start Listening mock", href: "/tests?type=listening" },
    secondaryCta: { label: "See full IELTS mock", href: "/ielts-mock-test-online" },
    highlights: [
      "IELTS Listening mock tests",
      "Audio-based online practice",
      "Answer review and progress focus",
      "Works from any device",
    ],
    sections: [
      {
        title: "IELTS Listening practice online",
        body:
          "PrimeScore helps students practice Listening tasks online instead of only relying on classroom audio drills.",
      },
      {
        title: "Designed for real timing pressure",
        body:
          "Online Listening practice is useful when learners need to improve attention, spelling, number capture, and section pacing.",
      },
      {
        title: "Part of the full IELTS mock platform",
        body:
          "Listening links naturally with Reading, Writing, and Speaking preparation, so learners do not train one skill in isolation.",
      },
    ],
    benefits: [
      "Practice Listening mock tests from home.",
      "Train under time pressure.",
      "Review answers after submission.",
      "Pair Listening with Reading and Writing practice.",
    ],
    faqs: [
      ...coreFaqs,
      {
        question: "Can I use PrimeScore for IELTS Listening online?",
        answer:
          "Yes. PrimeScore includes IELTS Listening mock practice and routes learners toward exam-style online preparation.",
      },
    ],
    searchIntents: [
      "Listening practice",
      "Audio-based tasks",
      "Timed mock tests",
      "Answer review",
    ],
    keywords: [
      "IELTS listening mock online",
      "IELTS listening practice test",
      "IELTS listening online Uzbekistan",
      "online listening mock IELTS",
    ],
    relatedSlugs: [
      "ielts-reading-mock-online",
      "ielts-speaking-mock-online",
      "ielts-mock-test-online",
    ],
  },
  {
    slug: "ielts-speaking-mock-online",
    path: "/ielts-speaking-mock-online",
    metaTitle: "IELTS Speaking Mock Online | Speaking Practice Platform",
    title: "IELTS Speaking mock online preparation",
    description:
      "Prepare for IELTS Speaking mock online with topic practice, interview-style preparation, and a dedicated Speaking route inside the IELTS platform.",
    badge: "Speaking mock online",
    lead:
      "PrimeScore gives IELTS learners a dedicated online Speaking preparation path alongside Reading, Listening, and Writing practice.",
    primaryCta: { label: "Open Speaking workspace", href: "/speaking" },
    secondaryCta: { label: "Practice Writing now", href: "/writing" },
    highlights: [
      "IELTS Speaking mock online",
      "Part 1, Part 2, and Part 3 preparation focus",
      "Online IELTS platform positioning",
      "Built for online IELTS learners",
    ],
    sections: [
      {
        title: "Speaking mock belongs in the same IELTS platform",
        body:
          "Speaking practice sits beside Reading, Listening, and Writing, so the full IELTS journey stays connected.",
      },
      {
        title: "Designed for consistent practice",
        body:
          "Students can keep Speaking preparation connected with the rest of their online IELTS practice instead of treating it as a separate problem.",
      },
      {
        title: "Connected to Writing and full mock practice",
        body:
          "Speaking preparation sits beside Writing feedback and Reading/Listening mock tests, so learners can train all four IELTS skills online.",
      },
    ],
    benefits: [
      "A dedicated place for IELTS Speaking preparation.",
      "Connects Speaking with the rest of IELTS preparation.",
      "Keeps Speaking connected with full IELTS preparation.",
      "Gives Search Console a clean Speaking URL to index.",
    ],
    faqs: [
      ...coreFaqs,
      {
        question: "Is this page for IELTS Speaking mock online?",
        answer:
          "Yes. This page is the dedicated PrimeScore route for Speaking preparation inside the online IELTS platform.",
      },
    ],
    searchIntents: [
      "Speaking preparation",
      "Interview-style practice",
      "Part 1, Part 2, Part 3",
      "Full IELTS practice",
    ],
    keywords: [
      "IELTS speaking mock online",
      "speaking mock online",
      "IELTS speaking mock Uzbekistan",
      "Tashkent speaking mock online",
    ],
    relatedSlugs: [
      "ielts-mock-test-tashkent",
      "ielts-mock-test-online",
    ],
  },
];

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
      url: absoluteUrl("/pricing"),
      priceCurrency: "UZS",
    },
  };
}
