"use client";
import type { PricingPlanGridProps } from "../shared";
import { usePricingPlanGridController } from "./controller";
import { PricingPlanGridView } from "./view";

export function PricingPlanGrid(props: PricingPlanGridProps) {
  const scope = usePricingPlanGridController(props);
  return <PricingPlanGridView scope={scope} />;
}
