import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
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
  const latestXpGain = summary.latestXpGain;
  const shouldShowLatestXpGain = latestXpGain !== null && latestXpGain > 0;

  return (
    <section className="relative h-full overflow-hidden rounded-[1.2rem] bg-indigo-600 p-[1px] shadow-xl shadow-indigo-950/15">
      <div className="relative h-full overflow-hidden rounded-[1.15rem] bg-white/[0.07] p-3.5 text-white backdrop-blur-xl md:p-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="relative h-[56px] w-[52px] shrink-0">
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
                <span className="text-[2rem] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.32)]">
                  {summary.level}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/75">Current Level</p>
                <div className="mt-0.5 flex flex-wrap items-end gap-1.5">
                  <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    {formatNumber(summary.totalXp)}
                    <span className="ml-1.5 text-lg font-semibold text-white/70">XP</span>
                  </h2>
                  {shouldShowLatestXpGain ? (
                    <span className="mb-0.5 inline-flex rounded-full bg-emerald-400/18 px-2 py-0.5 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-200/25">
                      +{formatNumber(latestXpGain)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="relative pt-1.5">
            <div className="absolute -top-[3.1rem] right-0 text-right sm:-top-12">
              <p className="text-base font-semibold leading-none tracking-tight text-white md:text-lg">
                {formatNumber(xpNeededForNextLevel)} XP
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white/65">to reach Level {nextLevel}</p>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-indigo-950/28 shadow-inner">
              <div className="absolute inset-0 bg-white/10" />
              <div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-violet-300 via-indigo-400 to-sky-300 shadow-[0_0_18px_rgba(129,140,248,0.58),0_0_30px_rgba(56,189,248,0.28)] transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between gap-4">
            <div className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3">
              <Image
                src="/badges/streak/day-14.png"
                alt="Next reward badge"
                width={72}
                height={72}
                className="h-8 w-auto shrink-0 object-contain"
              />
              <div className="min-w-0 leading-none">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">Next reward</p>
                <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-white/90">Consistent Learner</p>
              </div>
            </div>

            <Link
              href="/achievements"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3.5 text-sm font-semibold text-white/70 transition hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
            >
              View all rewards
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
