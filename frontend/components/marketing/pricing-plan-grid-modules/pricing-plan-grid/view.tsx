"use client";
import type { PricingPlanGridScope } from "./controller";
import { PricingPlanGridView1 } from "./view-section-01";

export function PricingPlanGridView({ scope }: { scope: PricingPlanGridScope }) {
  return <PricingPlanGridView1 scope={scope} />;
}
