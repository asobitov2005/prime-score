"use client";

import Image from "next/image";
import { CheckCircle2, Star, Unlock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Achievement } from "@/src/types/achievement";
import { cn } from "@/lib/utils";

function isBronzeLearnerBadge(achievement: Achievement): boolean {
  return achievement.id === "level-bronze-learner" || achievement.title === "Bronze Learner";
}

export function LevelProgressSummaryCard({
  achievements,
  onEquip,
}: {
  achievements: Achievement[];
  onEquip: (achievement: Achievement) => void;
}) {
  const featuredBadge = achievements.find((achievement) => achievement.featured) ?? achievements[0];
  const unlockedBadges = useMemo(
    () => achievements.filter((achievement) => achievement.status === "unlocked"),
    [achievements],
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pickerOpen]);

  function selectBadge(achievement: Achievement) {
    onEquip(achievement);
    setPickerOpen(false);
  }

  return (
    <section className="relative w-full rounded-[18px] border border-[#E5E7EB] bg-white px-6 py-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-[76px] w-[70px] shrink-0" aria-label="Current level 6">
            <svg className="absolute inset-0 h-full w-full drop-shadow-[0_14px_24px_rgba(49,46,129,0.22)]" viewBox="0 0 76 82" fill="none" aria-hidden="true">
              <path
                d="M38 2.5c4.4 0 8.8 1.1 12.2 3.1l12.1 7.1c6.8 4 11.2 11.3 11.2 19.2v18.2c0 7.9-4.4 15.2-11.2 19.2l-12.1 7.1c-3.4 2-7.8 3.1-12.2 3.1s-8.8-1.1-12.2-3.1l-12.1-7.1C6.9 65.3 2.5 58 2.5 50.1V31.9c0-7.9 4.4-15.2 11.2-19.2l12.1-7.1c3.4-2 7.8-3.1 12.2-3.1Z"
                fill="url(#achievements-level-hex-soft)"
              />
              <path
                d="M38 6.8c3.7 0 7.3.9 10.2 2.6l12.1 7.1c5.5 3.2 8.9 9.1 8.9 15.4v18.2c0 6.3-3.4 12.2-8.9 15.4l-12.1 7.1c-2.9 1.7-6.5 2.6-10.2 2.6s-7.3-.9-10.2-2.6l-12.1-7.1c-5.5-3.2-8.9-9.1-8.9-15.4V31.9c0-6.3 3.4-12.2 8.9-15.4l12.1-7.1c2.9-1.7 6.5-2.6 10.2-2.6Z"
                fill="url(#achievements-level-hex-inner)"
                stroke="rgba(255,255,255,0.42)"
              />
              <path
                d="M16.4 18.8 28.5 12c2.6-1.5 6-2.3 9.5-2.3s6.9.8 9.5 2.3l12.1 6.8c3.5 2 6 5.2 7.1 8.9-8.2-4.2-17.9-6.4-28.7-6.4s-20.5 2.2-28.7 6.4c1.1-3.7 3.6-6.9 7.1-8.9Z"
                fill="white"
                opacity="0.28"
              />
              <defs>
                <linearGradient id="achievements-level-hex-soft" x1="11" x2="66" y1="8" y2="73" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8B5CF6" />
                  <stop offset="0.52" stopColor="#6366F1" />
                  <stop offset="1" stopColor="#22D3EE" />
                </linearGradient>
                <radialGradient id="achievements-level-hex-inner" cx="0" cy="0" r="1" gradientTransform="translate(30 25) rotate(55) scale(56 49)" gradientUnits="userSpaceOnUse">
                  <stop stopColor="rgba(255,255,255,0.34)" />
                  <stop offset="0.48" stopColor="rgba(255,255,255,0.08)" />
                  <stop offset="1" stopColor="rgba(30,41,59,0.24)" />
                </radialGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[2.35rem] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.32)]">
                6
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[#64748B]">Current Level</p>
            <div className="mt-0.5 max-w-[360px]">
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#6D4CFF]">Level 6</h2>
                <div className="shrink-0 pb-0.5 text-right">
                  <p className="text-lg font-bold leading-none tracking-[-0.02em] text-[#0F172A]">985 XP</p>
                  <p className="mt-1.5 text-xs font-semibold leading-none text-[#64748B]">to reach Level 7</p>
                </div>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#E5E7EB] shadow-inner">
                <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6D4CFF]" />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden h-[60px] w-px shrink-0 bg-[#E5E7EB] lg:block" />

        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center xl:gap-8">
          <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 xl:border-0 xl:p-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3EFFF] text-[#6D4CFF]">
              <Star className="h-[18px] w-[18px] fill-current" />
            </span>
            <div>
              <p className="text-2xl font-bold leading-none tracking-[-0.03em] text-[#6D4CFF]">2,615 XP</p>
              <p className="mt-1.5 text-sm font-medium text-[#64748B]">Total XP Earned</p>
            </div>
          </div>

          <div className="hidden h-[60px] w-px shrink-0 bg-[#E5E7EB] xl:block" />

          <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 xl:border-0 xl:p-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#10B981]">
              <Unlock className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-2xl font-bold leading-none tracking-[-0.03em] text-[#10B981]">18</p>
              <p className="mt-1.5 text-sm font-medium text-[#64748B]">Rewards Unlocked</p>
            </div>
          </div>

          {featuredBadge ? (
            <>
              <div className="hidden h-[60px] w-px shrink-0 bg-[#E5E7EB] xl:block" />

              <div className="relative sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="group flex min-w-0 items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left transition hover:border-[#C7D2FE] hover:bg-[#F8FAFC] hover:shadow-[0_16px_34px_-28px_rgba(79,70,229,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4CFF]/35 xl:min-w-[240px] xl:border-0 xl:p-0 xl:hover:bg-transparent xl:hover:shadow-none"
                  aria-haspopup="dialog"
                  aria-expanded={pickerOpen}
                >
                  <div className="flex h-[76px] w-[96px] shrink-0 items-center justify-center rounded-2xl bg-[#F8FAFC]">
                    <Image
                      src={featuredBadge.image}
                      alt={featuredBadge.title}
                      width={120}
                      height={88}
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      onContextMenu={(event) => event.preventDefault()}
                      className="h-16 w-auto max-w-[5.5rem] select-none object-contain drop-shadow-lg"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#64748B]">Featured badge</p>
                    <p className="mt-1 truncate text-xl font-bold tracking-[-0.02em] text-[#0F172A]">{featuredBadge.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6D4CFF] opacity-0 transition group-hover:opacity-100">
                      Change badge
                    </p>
                  </div>
                </button>

                {pickerOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close badge picker"
                      className="fixed inset-0 z-[80] cursor-default bg-transparent"
                      onClick={() => setPickerOpen(false)}
                    />
                    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[100] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.5)]" role="dialog" aria-modal="false" aria-labelledby="featured-badge-picker-title">
                      <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6D4CFF]">Featured badge</p>
                          <h2 id="featured-badge-picker-title" className="mt-1 text-base font-bold tracking-[-0.02em] text-[#0F172A]">
                            Choose your equipped badge
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPickerOpen(false)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#64748B] transition hover:bg-[#EEF2FF] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4CFF]/35"
                          aria-label="Close badge picker"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="max-h-[21rem] overflow-y-auto p-3">
                        {unlockedBadges.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2.5">
                            {unlockedBadges.map((achievement) => {
                              const isSelected = achievement.id === featuredBadge.id;

                              return (
                                <button
                                  key={achievement.id}
                                  type="button"
                                  onClick={() => selectBadge(achievement)}
                                  className="group relative flex min-h-[116px] flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#C7D2FE] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4CFF]/35"
                                >
                                  {isSelected ? (
                                    <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[#10B981] ring-1 ring-emerald-100">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </span>
                                  ) : null}

                                  <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-[#F8FAFC] transition group-hover:bg-[#F3EFFF]">
                                    <Image
                                      src={achievement.image}
                                      alt={achievement.title}
                                      width={112}
                                      height={84}
                                      draggable={false}
                                      onDragStart={(event) => event.preventDefault()}
                                      onContextMenu={(event) => event.preventDefault()}
                                      className={cn(
                                        "h-12 w-auto max-w-[4.75rem] select-none object-contain drop-shadow-md transition group-hover:scale-105",
                                        isBronzeLearnerBadge(achievement) && "h-[3.55rem] max-w-none scale-[1.18] group-hover:scale-[1.24]",
                                      )}
                                    />
                                  </div>
                                  <p className="mt-2 line-clamp-2 text-xs font-bold leading-4 text-[#0F172A]">{achievement.title}</p>
                                  <p className="mt-1 text-[11px] font-semibold text-[#64748B]">
                                    {isSelected ? "Equipped" : "Equip"}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-center">
                            <p className="text-sm font-semibold text-[#0F172A]">No unlocked badges yet</p>
                            <p className="mt-1 text-xs text-[#64748B]">Unlocked badges will appear here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
