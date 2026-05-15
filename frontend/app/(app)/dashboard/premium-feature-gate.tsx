"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

interface PremiumFeatureGateProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PremiumFeatureGate({ title, description, children }: PremiumFeatureGateProps) {
  const isPremium = useAuthStore((state) => state.isPremium);

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <Card className="relative overflow-hidden rounded-3xl border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Premium Feature</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-muted-foreground">{description}</p>
        </div>
        <Button asChild className="rounded-xl px-5 text-xs font-black uppercase tracking-[0.16em]">
          <Link href="/subscription">Upgrade Now</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
