"use client";
import { useReviewsAdminPageController } from "./controller";
import { ReviewsAdminPageView } from "./view";

export function ReviewsAdminPage() {
  const scope = useReviewsAdminPageController();
  return <ReviewsAdminPageView scope={scope} />;
}
