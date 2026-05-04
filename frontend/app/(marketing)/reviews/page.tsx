import type { Metadata } from "next";
import { ReviewsPageClient } from "@/components/marketing/reviews-page-client";
import { getPublicReviews } from "@/lib/server-reviews";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "PrimeScore Student Reviews and IELTS Success Stories",
  description:
    "Read student feedback about PrimeScore IELTS mock online practice, Reading, Listening, Writing feedback, band score preparation, and computer-delivered exam experience.",
  alternates: {
    canonical: absoluteUrl("/reviews"),
  },
  openGraph: {
    url: absoluteUrl("/reviews"),
    title: "PrimeScore Student Reviews and IELTS Success Stories",
    description:
      "See what IELTS learners say about PrimeScore mock tests, review flow, Writing feedback, and exam-style online IELTS preparation.",
    images: [
      {
        url: absoluteUrl(defaultOgImage),
        width: 1088,
        height: 944,
        alt: "PrimeScore student reviews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrimeScore Student Reviews and IELTS Success Stories",
    description:
      "Read public feedback from IELTS learners using PrimeScore for IELTS mock online practice.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

export default async function ReviewsPage() {
  const reviews = await getPublicReviews(24);

  return <ReviewsPageClient initialReviews={reviews} />;
}
