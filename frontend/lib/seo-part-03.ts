import { absoluteUrl, defaultOgImage, pricingFaqs } from "./seo-part-01";

export function buildPricingWebPageStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl("/#pricing"),
    url: absoluteUrl("/#pricing"),
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
    "@id": absoluteUrl("/#pricing-offers"),
    name: "PrimeScore pricing plans",
    itemListElement: plans.map((plan, index) => ({
      "@type": "Offer",
      position: index + 1,
      name: `${plan.title} PrimeScore plan`,
      description: `One-time ${plan.durationDays}-day PrimeScore plan for IELTS mock online practice.`,
      price: Number.isFinite(plan.numericPrice) ? plan.numericPrice.toFixed(0) : "0",
      priceCurrency: plan.currency,
      url: absoluteUrl("/#pricing"),
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
