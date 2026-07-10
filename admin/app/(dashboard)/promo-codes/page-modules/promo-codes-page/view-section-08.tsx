"use client";
import type { PromoCodesPageScope } from "./controller";
import { Badge, CardDescription, CardHeader, CardTitle, Ticket } from "../dependencies";

export function PromoCodesPageSection8({ scope }: { scope: PromoCodesPageScope }) {
  const { filteredCodes, codes } = scope;
  return (
    <CardHeader className="border-b border-border/40 bg-muted/10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Redeem code inventory</CardTitle>
                      <CardDescription>Search by code, plan, or recipient. Review validity, usage, latest claim, and current status.</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{filteredCodes.length} shown</Badge>
                    <Badge tone="info">{codes.length} total</Badge>
                  </div>
                </div>
              </CardHeader>
  );
}
