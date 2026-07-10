"use client";
import type { PlanManagerScope } from "./controller";
import { Card, CardDescription, CardHeader, CardTitle } from "../dependencies";

export function PlanManagerSection4({ scope }: { scope: PlanManagerScope }) {
  const { totalPlans, activePlans, featuredPlans } = scope;
  return (
    <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total plans</CardDescription>
                <CardTitle className="text-2xl">{totalPlans}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Visible on pricing</CardDescription>
                <CardTitle className="text-2xl">{activePlans}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Featured cards</CardDescription>
                <CardTitle className="text-2xl">{featuredPlans}</CardTitle>
              </CardHeader>
            </Card>
          </div>
  );
}
