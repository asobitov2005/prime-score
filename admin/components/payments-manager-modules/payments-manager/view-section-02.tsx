"use client";
import type { PaymentsManagerScope } from "./controller";
import { Button, SectionHeader } from "../dependencies";

export function PaymentsManagerSection2({ scope }: { scope: PaymentsManagerScope }) {
  const { refreshAll, refreshing } = scope;
  return (
    <SectionHeader
            eyebrow="Revenue ops"
            title="Payments"
            description="Manual card-transfer invoices, support screenshot flow, and premium activation controls."
            actions={
              <Button type="button" variant="outline" size="sm" onClick={() => void refreshAll()} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            }
          />
  );
}
