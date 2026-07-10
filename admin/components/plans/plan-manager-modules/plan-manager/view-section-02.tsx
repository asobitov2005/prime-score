"use client";
import type { PlanManagerScope } from "./controller";
import { Button, Plus, SectionHeader } from "../dependencies";

export function PlanManagerSection2({ scope }: { scope: PlanManagerScope }) {
  const { openCreate } = scope;
  return (
    <SectionHeader
            eyebrow="Catalog"
            title="Subscription plans"
            description="These plans feed the landing page, /pricing, and the user subscription page directly from the database."
            actions={
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Create plan
              </Button>
            }
          />
  );
}
