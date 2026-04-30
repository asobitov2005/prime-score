"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

export function PremiumDashboardSpotlight() {
  const isPremium = useAuthStore((state) => state.isPremium);
  const premiumUntil = useAuthStore((state) => state.premiumUntil);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const countdown = useMemo(() => {
    if (!isPremium || !premiumUntil) {
      return { days: 0, hours: 0, minutes: 0 };
    }

    const diffMs = Math.max(0, new Date(premiumUntil).getTime() - now);
    const totalMinutes = Math.floor(diffMs / 60_000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    return { days, hours, minutes };
  }, [premiumUntil, now]);

  const expiryLabel = isPremium && premiumUntil
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(premiumUntil))
    : null;

  return (
    <Card className="w-full min-h-[224px] rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      <CardContent className="flex h-full flex-col p-5">
        <div className="space-y-2">
          <p className="bg-gradient-to-r from-primary/90 via-primary to-primary/70 bg-clip-text text-base font-black leading-tight tracking-tight text-transparent">
            {isPremium ? "Your premium access is active." : "Premium Countdown"}
          </p>
          <p className="max-w-[28ch] text-xs font-medium leading-5 text-muted-foreground">
            {isPremium
              ? (expiryLabel ? `Expires on ${expiryLabel}` : "Expiry date is attached to your account.")
              : "Upgrade to unlock premium access and start your countdown."}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
            {[
              { label: "Days", value: String(countdown.days).padStart(2, "0") },
              { label: "Hours", value: String(countdown.hours).padStart(2, "0") },
              { label: "Minutes", value: String(countdown.minutes).padStart(2, "0") },
            ].map((item) => (
              <div key={item.label} className="rounded-[18px] border border-primary/15 bg-background/85 px-2.5 py-2 text-center shadow-sm">
                <p className="text-lg font-black leading-none tracking-tight text-foreground">{item.value}</p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
              </div>
            ))}
        </div>

        <Button asChild className="mt-4 h-9 w-full rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90">
          <Link href="/subscription">
            {isPremium ? "Manage Premium" : "Upgrade Now"} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
