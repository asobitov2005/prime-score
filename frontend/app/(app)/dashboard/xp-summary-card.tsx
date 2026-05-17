import Link from "next/link";
import { ArrowRight, BadgeCheck, Gift } from "lucide-react";
import type { XpSummary } from "@/lib/types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getTotalProgressPercent(summary: XpSummary): number {
  const nextLevelXp = summary.progress.nextLevelXp;

  if (nextLevelXp > 0) {
    return Math.max(0, Math.min((summary.totalXp / nextLevelXp) * 100, 100));
  }

  return Math.max(0, Math.min(summary.progress.progressPercent, 100));
}

export function XpSummaryCard({ summary }: { summary: XpSummary }) {
  const nextLevel = summary.level + 1;
  const xpNeededForNextLevel = Math.max(0, summary.progress.nextLevelXp - summary.totalXp);
  const progressPercent = getTotalProgressPercent(summary);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-[1px] shadow-2xl shadow-indigo-950/20">
      <div className="absolute inset-x-0 top-0 h-24 bg-white/10" />

      <div className="relative overflow-hidden rounded-[1.7rem] bg-white/[0.08] p-5 text-white backdrop-blur-xl md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="relative h-[82px] w-[76px] shrink-0">
                <svg className="absolute inset-0 h-full w-full drop-shadow-[0_14px_24px_rgba(49,46,129,0.28)]" viewBox="0 0 76 82" fill="none" aria-hidden="true">
                  <path
                    d="M38 2.5c4.4 0 8.8 1.1 12.2 3.1l12.1 7.1c6.8 4 11.2 11.3 11.2 19.2v18.2c0 7.9-4.4 15.2-11.2 19.2l-12.1 7.1c-3.4 2-7.8 3.1-12.2 3.1s-8.8-1.1-12.2-3.1l-12.1-7.1C6.9 65.3 2.5 58 2.5 50.1V31.9c0-7.9 4.4-15.2 11.2-19.2l12.1-7.1c3.4-2 7.8-3.1 12.2-3.1Z"
                    fill="url(#level-hex-soft)"
                  />
                  <path
                    d="M38 6.8c3.7 0 7.3.9 10.2 2.6l12.1 7.1c5.5 3.2 8.9 9.1 8.9 15.4v18.2c0 6.3-3.4 12.2-8.9 15.4l-12.1 7.1c-2.9 1.7-6.5 2.6-10.2 2.6s-7.3-.9-10.2-2.6l-12.1-7.1c-5.5-3.2-8.9-9.1-8.9-15.4V31.9c0-6.3 3.4-12.2 8.9-15.4l12.1-7.1c2.9-1.7 6.5-2.6 10.2-2.6Z"
                    fill="url(#level-hex-inner)"
                    stroke="rgba(255,255,255,0.42)"
                  />
                  <path
                    d="M16.4 18.8 28.5 12c2.6-1.5 6-2.3 9.5-2.3s6.9.8 9.5 2.3l12.1 6.8c3.5 2 6 5.2 7.1 8.9-8.2-4.2-17.9-6.4-28.7-6.4s-20.5 2.2-28.7 6.4c1.1-3.7 3.6-6.9 7.1-8.9Z"
                    fill="white"
                    opacity="0.28"
                  />
                  <defs>
                    <linearGradient id="level-hex-soft" x1="11" x2="66" y1="8" y2="73" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8B5CF6" />
                      <stop offset="0.52" stopColor="#6366F1" />
                      <stop offset="1" stopColor="#22D3EE" />
                    </linearGradient>
                    <radialGradient id="level-hex-inner" cx="0" cy="0" r="1" gradientTransform="translate(30 25) rotate(55) scale(56 49)" gradientUnits="userSpaceOnUse">
                      <stop stopColor="rgba(255,255,255,0.34)" />
                      <stop offset="0.48" stopColor="rgba(255,255,255,0.08)" />
                      <stop offset="1" stopColor="rgba(30,41,59,0.24)" />
                    </radialGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[2.15rem] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.32)]">
                    {summary.level}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white/75">Current Level</p>
                  <h2 className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl">
                    {formatNumber(summary.totalXp)}
                    <span className="ml-2 text-2xl font-semibold text-white/70">XP</span>
                  </h2>
                </div>
                <div className="pb-1">
                  <p className="text-2xl font-semibold leading-none tracking-tight text-white md:text-3xl">
                    {formatNumber(xpNeededForNextLevel)} XP
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white/65">to reach Level {nextLevel}</p>
                </div>
              </div>
            </div>

            <div className="relative h-5 overflow-hidden rounded-full bg-indigo-950/28 shadow-inner">
              <div className="absolute inset-0 bg-white/10" />
              <div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-violet-300 via-indigo-400 to-sky-300 shadow-[0_0_18px_rgba(129,140,248,0.58),0_0_30px_rgba(56,189,248,0.28)] transition-all duration-1000 ease-out after:absolute after:inset-x-1 after:top-1 after:h-1/3 after:rounded-full after:bg-white/40"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.12] p-4 shadow-xl shadow-indigo-950/10 backdrop-blur">
            <div className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-amber-100">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/70">Next reward preview</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">Consistent Learner Badge</h3>
              </div>
            </div>

            <Link
              href="/rewards"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/25"
            >
              <BadgeCheck className="h-4 w-4" />
              View all rewards
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
