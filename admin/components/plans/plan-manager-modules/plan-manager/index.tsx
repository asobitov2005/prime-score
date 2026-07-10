"use client";
import type { PlanManagerProps } from "../shared";
import { usePlanManagerController } from "./controller";
import { PlanManagerView } from "./view";

export function PlanManager(props: PlanManagerProps) {
  const scope = usePlanManagerController(props);
  return <PlanManagerView scope={scope} />;
}
