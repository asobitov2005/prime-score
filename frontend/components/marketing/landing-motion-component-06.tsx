"use client";

import { ArrowUpRight, Award, BookOpenText, Gauge, Headphones, PenTool, Play, Settings2, Trophy, cn, useEffect, useState } from "./landing-motion-dependencies";
import { progressBars } from "./landing-motion-component-04";
import { skillRows } from "./landing-motion-component-05";

export function DeviceShowcase() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setOn(true), 450);
    return () => window.clearTimeout(id);
  }, []);

  const r = 30;
  const circumference = 2 * Math.PI * r;
  const ringOffset = on ? circumference * (1 - 0.89) : circumference;
  const navItems = [
    { label: "Dashboard", Icon: Gauge, active: true },
    { label: "Practice Tests", Icon: BookOpenText, active: false },
    { label: "Writing Feedback", Icon: PenTool, active: false },
    { label: "Leaderboard", Icon: Trophy, active: false },
    { label: "Achievements", Icon: Award, active: false },
    { label: "Settings", Icon: Settings2, active: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-5xl select-none">
      {/* glow */}
      <div className="pointer-events-none absolute inset-x-10 top-10 -z-10 h-3/4 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(249,115,22,0.3),transparent_70%)] blur-2xl dark:bg-[radial-gradient(60%_60%_at_50%_30%,rgba(249,115,22,0.22),transparent_70%)]" />

      {/* ── Laptop ── */}
      <div className="animate-soft-float">
        <div className="relative mx-auto w-[88%]">
          {/* screen body */}
          <div className="overflow-hidden rounded-t-[1.25rem] border-[10px] border-slate-900 bg-slate-900 shadow-[0_50px_120px_-40px_rgba(15,23,42,0.65)] dark:border-slate-800 dark:bg-slate-800 dark:shadow-black/55 sm:border-[14px]">
            <div className="overflow-hidden rounded-md bg-[#fbfaf9] dark:bg-slate-950">
              {/* browser bar */}
              <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div className="ml-2 flex h-5 flex-1 items-center justify-center rounded-md bg-slate-100 text-[9px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500 sm:h-6 sm:text-[10px]">
                  primescore.uz/dashboard
                </div>
              </div>

              {/* app body */}
              <div className="flex aspect-[16/10] overflow-hidden">
                {/* sidebar */}
                <aside className="hidden w-36 shrink-0 flex-col border-r border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 sm:flex lg:w-44">
                  <div className="flex items-center gap-1.5">
                    <img src="/logo-light.svg" alt="PrimeScore" className="h-5 w-auto shrink-0 object-contain dark:hidden" />
                    <img src="/logo.svg" alt="PrimeScore" className="hidden h-5 w-auto shrink-0 object-contain dark:block" />
                    <span className="flex h-4 min-w-0 items-center" aria-hidden="true">
                      <img src="/exam-logo-lightmode.svg" alt="" className="h-full w-auto max-w-full object-contain dark:hidden" />
                      <img src="/exam-logo-darkmode.svg" alt="" className="hidden h-full w-auto max-w-full object-contain dark:block" />
                    </span>
                  </div>
                  <div className="mt-5 space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.Icon;
                      return (
                        <div
                          key={item.label}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors",
                            item.active
                              ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                              : "text-slate-500 dark:text-slate-400",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5",
                              item.active ? "text-orange-600 dark:text-orange-300" : "text-slate-400 dark:text-slate-500",
                            )}
                          />
                          {item.label}
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* main */}
                <main className="flex-1 overflow-hidden p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{"Welcome back"}</p>
                      <p className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-sm">{"Your progress"}</p>
                    </div>
                    <span className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 sm:h-7 sm:w-7" />
                  </div>

                  <div className="mt-3 grid grid-cols-[0.9fr_1.1fr] gap-2.5 sm:gap-3">
                    {/* band score */}
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                      <div className="relative h-[68px] w-[68px] shrink-0 sm:h-[76px] sm:w-[76px]">
                        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-slate-100 dark:stroke-slate-800" />
                          <circle
                            cx="40"
                            cy="40"
                            r={r}
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={ringOffset}
                            className="stroke-orange-500"
                            style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.16,1,0.3,1)" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-base font-extrabold leading-none text-slate-900 dark:text-white sm:text-lg">8.0</span>
                          <span className="text-[7px] font-medium text-slate-400 dark:text-slate-500">{"band"}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{"Overall"}</p>
                        <p className="text-[11px] font-bold text-orange-500">{"Good user"}</p>
                        <p className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                          <ArrowUpRight className="h-2.5 w-2.5" /> +0.5
                        </p>
                      </div>
                    </div>

                    {/* chart */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{"Band progress"}</p>
                        <p className="text-[9px] font-bold text-orange-500 dark:text-orange-300">8.0</p>
                      </div>
                      <div className="mt-2.5 flex h-12 items-end gap-1.5 sm:h-16">
                        {progressBars.map((h, i) => (
                          <div key={i} className="flex-1 overflow-hidden rounded-t-sm bg-slate-100 dark:bg-slate-800">
                            <div
                              className="w-full rounded-t-sm bg-gradient-to-t from-orange-500 to-amber-400"
                              style={{
                                height: on ? `${h}%` : "0%",
                                transition: "height 1s cubic-bezier(0.16,1,0.3,1)",
                                transitionDelay: `${i * 90}ms`,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* skills */}
                  <div className="mt-2.5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:mt-3">
                    <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{"Skill breakdown"}</p>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {skillRows.map((s) => (
                        <div key={s.label} className="text-center">
                          <p className={cn("text-[13px] font-extrabold leading-none sm:text-sm", s.tone)}>{s.value}</p>
                          <p className="mt-1 text-[8px] font-medium text-slate-400 dark:text-slate-500">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
          {/* laptop base */}
          <div className="relative mx-auto h-3 w-[112%] -translate-x-[5.4%] rounded-b-xl bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 sm:h-3.5">
            <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-slate-500/60 dark:bg-slate-950/55" />
          </div>
        </div>
      </div>

      {/* ── Phone ── */}
      <div className="animate-soft-float-alt absolute -bottom-6 right-0 w-[34%] max-w-[180px] sm:-right-2 sm:bottom-2">
        <div className="overflow-hidden rounded-[1.75rem] border-[5px] border-slate-900 bg-slate-900 shadow-[0_40px_90px_-30px_rgba(15,23,42,0.7)] dark:border-slate-800 dark:bg-slate-800 dark:shadow-black/55 sm:rounded-[2.25rem] sm:border-[7px]">
          <div className="relative overflow-hidden rounded-[1.4rem] bg-[#fbfaf9] dark:bg-slate-950 sm:rounded-[1.7rem]">
            {/* notch */}
            <div className="absolute left-1/2 top-0 z-10 h-3 w-12 -translate-x-1/2 rounded-b-xl bg-slate-900 dark:bg-slate-800 sm:h-4 sm:w-16" />
            <div className="px-3 pb-4 pt-6 sm:px-4 sm:pt-7">
              <p className="text-[10px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-xs">{"Your progress"}</p>

              <div className="mt-3 flex justify-center">
                <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                  <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                    <circle cx="40" cy="40" r={r} fill="none" strokeWidth="9" className="stroke-slate-100 dark:stroke-slate-800" />
                    <circle
                      cx="40"
                      cy="40"
                      r={r}
                      fill="none"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={ringOffset}
                      className="stroke-orange-500"
                      style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.16,1,0.3,1)", transitionDelay: "200ms" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-extrabold leading-none text-slate-900 dark:text-white sm:text-base">8.0</span>
                    <span className="text-[7px] font-medium text-slate-400 dark:text-slate-500">{"Good"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {skillRows.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                      {s.label === "Listening" ? <Headphones className="h-2.5 w-2.5" /> : null}
                      {s.label}
                    </span>
                    <span className={cn("text-[9px] font-bold", s.tone)}>{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-orange-500 py-1.5 text-[9px] font-bold text-white">
                <Play className="h-2.5 w-2.5 fill-white" />
                {"Continue"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
