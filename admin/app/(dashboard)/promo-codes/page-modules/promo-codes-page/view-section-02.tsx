"use client";
import type { PromoCodesPageScope } from "./controller";
import { Button, Gift, RefreshCw, SectionHeader, cn } from "../dependencies";

export function PromoCodesPageSection2({ scope }: { scope: PromoCodesPageScope }) {
  const { setIsCreateModalOpen, loadPage, refreshing } = scope;
  return (
    <SectionHeader
            eyebrow="Revenue Ops"
            title="Redeem codes"
            description="Create premium redeem codes with date windows, usage caps, audience targeting, and one-code-at-a-time protection for users."
            actions={(
              <>
                <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                  <Gift className="h-4 w-4" />
                  Create code
                </Button>
                <Button variant="outline" size="sm" onClick={() => void loadPage("refresh")} disabled={refreshing}>
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </>
            )}
          />
  );
}
