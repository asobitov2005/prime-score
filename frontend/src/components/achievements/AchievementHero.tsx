import Image from "next/image";
import { Award, BadgeCheck, Sparkles, Trophy } from "lucide-react";
import type { Achievement } from "@/src/types/achievement";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function AchievementHero({ achievements }: { achievements: Achievement[] }) {
  const totalBadges = achievements.length;
  const unlockedBadges = achievements.filter((achievement) => achievement.status === "unlocked").length;
  const completionPercent = totalBadges > 0 ? Math.round((unlockedBadges / totalBadges) * 100) : 0;
  const equippedBadge = achievements.find((achievement) => achievement.status === "unlocked" && achievement.featured)
    ?? achievements.find((achievement) => achievement.status === "unlocked");
  const featuredBadge = equippedBadge ?? achievements.find((achievement) => achievement.featured) ?? achievements[0];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-slate-200/70 dark:bg-slate-950/80 dark:shadow-black/30">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300" />
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-200/35 blur-3xl dark:bg-violet-500/15" />
      <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-500/10" />

      <div className="relative grid gap-6 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              PrimeScore Rewards
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Achievements</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted-foreground md:text-base">
                Unlock badges as you build consistency, improve your IELTS skills, and climb the leaderboard.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-white/[0.04]">
              <p className="text-xs font-semibold text-muted-foreground">Total badges</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{formatNumber(totalBadges)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/70 p-4 shadow-sm dark:bg-emerald-500/10">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Unlocked badges</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{formatNumber(unlockedBadges)}</p>
            </div>
            <div className="rounded-2xl bg-blue-50/70 p-4 shadow-sm dark:bg-blue-500/10">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Completion</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{completionPercent}%</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-4 dark:bg-white/[0.04]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Current equipped badge</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{equippedBadge?.title ?? "No badge equipped"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground sm:text-right">Current title</p>
            <p className="mt-1 text-lg font-semibold text-foreground">Consistent Learner</p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white shadow-inner dark:bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 shadow-[0_0_18px_rgba(59,130,246,0.35)]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[300px] rounded-[1.75rem] border border-border/50 bg-white/65 p-5 text-center shadow-2xl shadow-violet-200/60 backdrop-blur dark:bg-white/[0.04] dark:shadow-black/30">
          <div className="absolute inset-x-8 top-4 h-20 rounded-full bg-violet-200/50 blur-2xl dark:bg-violet-500/20" />
          <div className="relative mx-auto flex h-36 w-48 items-center justify-center">
            {featuredBadge ? (
              <Image src={featuredBadge.image} alt={featuredBadge.title} width={192} height={120} className="relative z-10 h-28 w-auto max-w-[11.5rem] object-contain drop-shadow-xl" priority />
            ) : (
              <Trophy className="h-16 w-16 text-violet-500" />
            )}
          </div>
          <div className="relative mt-4">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-violet-950/50">
              <Award className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Featured badge</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{featuredBadge?.title ?? "PrimeScore Badge"}</h2>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              {unlockedBadges} unlocked
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
