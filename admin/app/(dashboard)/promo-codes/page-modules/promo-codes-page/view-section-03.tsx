"use client";
import type { PromoCodesPageScope } from "./controller";
import { MetricCard } from "../shared";

export function PromoCodesPageSection3({ scope }: { scope: PromoCodesPageScope }) {
  const { metrics } = scope;
  return (
    <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Available" value={String(metrics.available)} detail="Ready to redeem right now." tone="success" />
            <MetricCard label="Redeemed" value={String(metrics.redeemed)} detail="Already claimed by users." tone="info" />
            <MetricCard label="Paused" value={String(metrics.paused)} detail="Created but intentionally blocked." tone="warning" />
            <MetricCard label="Expiring Soon" value={String(metrics.expiringSoon)} detail="Expires within the next 7 days." tone="danger" />
          </div>
  );
}
