import Link from "next/link";
import { ArrowLeft, BadgeCheck, Flame, Gift, Lock, Sparkles, Trophy } from "lucide-react";

const rewards = [
  {
    title: "Consistent Learner Badge",
    detail: "Keep your streak active and complete focused practice sessions.",
    status: "Next reward",
    icon: Flame,
    tone: "text-orange-300",
  },
  {
    title: "Mock Master Badge",
    detail: "Complete full Reading and Listening mocks with steady accuracy.",
    status: "Locked",
    icon: Trophy,
    tone: "text-amber-200",
  },
  {
    title: "Precision Streak Bonus",
    detail: "Earn bonus XP for accurate answers across multiple attempts.",
    status: "Locked",
    icon: BadgeCheck,
    tone: "text-cyan-200",
  },
];

export default function RewardsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-[1px] shadow-2xl shadow-indigo-950/20">
        <div className="rounded-[1.7rem] bg-white/[0.08] p-5 text-white backdrop-blur-xl md:p-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                PrimeScore Rewards
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Rewards</h1>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-white/75">
                Unlock badges and XP bonuses as your practice consistency, accuracy, and mock completion improve.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[0.12] p-4 shadow-xl shadow-indigo-950/10 backdrop-blur">
              <p className="text-sm font-semibold text-white/70">Next unlock</p>
              <p className="mt-1 text-xl font-semibold">Consistent Learner Badge</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {rewards.map((reward) => {
          const Icon = reward.icon;
          const locked = reward.status === "Locked";

          return (
            <div key={reward.title} className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-slate-900/5">
              <div className="flex items-start justify-between gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-muted ${reward.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {locked && <Lock className="h-3 w-3" />}
                  {reward.status}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{reward.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{reward.detail}</p>
            </div>
          );
        })}
      </section>

      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Gift className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">More reward tiers will appear here as XP milestones expand.</p>
        </div>
      </div>
    </div>
  );
}
