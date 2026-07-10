"use client";

import { ArrowUpRight, Sparkles, Target, useEffect, useState } from "./landing-motion-dependencies";
import { bars } from "./landing-motion-component-02";

// Floating glass report card with bars that animate on mount.
export function ScoreCard() {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setFilled(true), 350);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md [perspective:1600px]">
      <div className="animate-soft-float">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_50px_120px_-40px_rgba(234,88,12,0.45)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-black/35 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-orange-300/60 to-amber-200/0 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="premium-live-dot" />
              <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500">{"Live report"}</span>
            </div>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
              {"Good user"}
            </span>
          </div>

          <div className="relative mt-5">
            <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500">{"Overall Band Score"}</p>
            <div className="flex items-end gap-3">
              <span className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-7xl font-bold leading-none tracking-tight text-transparent dark:from-white dark:to-slate-300">
                7.0
              </span>
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-sm font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                <ArrowUpRight className="h-4 w-4" /> 0.5
              </span>
            </div>
          </div>

          <div className="relative mt-6 space-y-3.5">
            {bars.map((row, i) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-slate-500 dark:text-slate-400">{row.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{row.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ width: filled ? `${row.width}%` : "0%", transitionDelay: `${i * 120}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="animate-soft-float-alt absolute -left-6 top-10 hidden items-center gap-2.5 rounded-2xl border border-white/70 bg-white/90 px-3.5 py-2.5 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.55)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-black/35 sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white">
          <Target className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{"Next focus"}</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Listening</p>
        </div>
      </div>

      <div className="animate-soft-float absolute -right-4 bottom-8 hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3.5 py-2.5 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.55)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-black/35 sm:flex">
        <Sparkles className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{"AI Feedback"}</span>
      </div>
    </div>
  );
}
