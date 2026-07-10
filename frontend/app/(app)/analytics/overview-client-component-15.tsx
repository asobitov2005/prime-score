"use client";

import { ArrowRight, Button, Card, CardContent, Crown, Link } from "./overview-client-dependencies";

export function AnalyticsPremiumGate({ subscriptionHref }: { subscriptionHref: string }) {
  return (
    <div className="analytics-night analytics-overview grid min-h-[calc(100vh-8rem)] place-items-center bg-[#F8FAFC] px-4 py-10 text-slate-950">
      <Card className="w-full max-w-xl overflow-hidden rounded-[1.35rem] border-amber-200 bg-white shadow-[0_24px_70px_-44px_rgba(154,52,18,0.45)]">
        <CardContent className="p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <Crown className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-600">Premium Analytics</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Analytics is available for Premium users</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">
            Upgrade to Premium to unlock overall analytics, skill breakdowns, and trends.
          </p>
          <Button asChild className="mt-6 h-11 rounded-xl bg-amber-500 px-6 text-sm font-bold text-white hover:bg-amber-600">
            <Link href={subscriptionHref}>
              Upgrade to Premium
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
