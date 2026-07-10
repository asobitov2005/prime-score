"use client";

import { ArrowLeft, ArrowRight, Crown, DashboardAnalytics, Link, getSubscriptionPageHref, useAuthStore } from "./dependencies";

import { Skill } from "./shared-part-01";

import { SpeakingAnalyticsContent } from "./shared-part-02";



export function SkillAnalyticsPremiumGate({ subscriptionHref }: { subscriptionHref: string }) {
  return (
    <div className="analytics-night grid min-h-[calc(100vh-8rem)] place-items-center bg-[#F8FAFC] px-4 py-10 text-[#0F172A]">
      <div className="w-full max-w-xl rounded-[22px] border border-amber-200 bg-white p-7 text-center shadow-[0_24px_70px_-44px_rgba(154,52,18,0.45)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <Crown className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-600">Premium Analytics</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">Skill analytics is a Premium feature</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#64748B]">
	          Upgrade to Premium to unlock detailed skill breakdowns, trends, and improvement priorities.
        </p>
        <Link
          href={subscriptionHref}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-bold text-white transition hover:bg-amber-600"
        >
          Upgrade to Premium
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function SkillAnalyticsClient({
  skill,
  initialAnalytics,
}: {
  skill: Skill;
  initialAnalytics: DashboardAnalytics;
}) {
  const { isPremium, isAuthenticated } = useAuthStore();
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);

  if (!isPremium) {
    return <SkillAnalyticsPremiumGate subscriptionHref={subscriptionHref} />;
  }

  if (skill === "reading") {
    return <SkillDetailContent variant="reading" analytics={initialAnalytics} />;
  }

  if (skill === "listening") {
    return <SkillDetailContent variant="listening" analytics={initialAnalytics} />;
  }

  if (skill === "writing") {
    return <WritingAnalyticsContent analytics={initialAnalytics} />;
  }

  if (skill === "speaking") {
    return <SpeakingAnalyticsContent analytics={initialAnalytics} />;
  }

  return (
    <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
      <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4 text-indigo-600" />
        Back to Analytics
      </Link>
      <div className="mt-6 rounded-[18px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Skill Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold capitalize tracking-tight text-[#0F172A]">{skill} Analytics</h1>
        <p className="mt-2 text-sm font-medium text-[#64748B]">Detailed analytics for this skill will appear here.</p>
      </div>
    </div>
  );
}
