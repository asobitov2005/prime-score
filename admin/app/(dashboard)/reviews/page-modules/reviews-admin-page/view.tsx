"use client";
import type { ReviewsAdminPageScope } from "./controller";
import { ReviewsAdminPageView1 } from "./view-section-04";

export function ReviewsAdminPageView({ scope }: { scope: ReviewsAdminPageScope }) {
  return <ReviewsAdminPageView1 scope={scope} />;
}
