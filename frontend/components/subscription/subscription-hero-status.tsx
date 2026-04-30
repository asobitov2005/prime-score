"use client";

import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";

export function SubscriptionHeroStatus() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isPremium = useAuthStore((state) => state.isPremium);
  const premiumUntil = useAuthStore((state) => state.premiumUntil);

  if (!hasHydrated || !isPremium) {
    return null;
  }

  const expiryLabel = premiumUntil
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(premiumUntil))
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="secondary" className="h-6 rounded-full bg-primary/10 px-2.5 py-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
        Premium active
      </Badge>
      {expiryLabel ? (
        <p className="text-[11px] font-medium text-muted-foreground">
          Active until <span className="font-semibold text-foreground">{expiryLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
