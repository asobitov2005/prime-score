"use client";
import type { PlanManagerScope } from "./controller";
import { PlanManagerView1 } from "./view-section-06";

export function PlanManagerView({ scope }: { scope: PlanManagerScope }) {
  return <PlanManagerView1 scope={scope} />;
}
