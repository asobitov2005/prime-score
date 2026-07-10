"use client";

export function ProfileModalLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 mt-2 h-24 w-24 rounded-full bg-slate-100 dark:bg-white/10 sm:h-28 sm:w-28" />
        <div className="h-7 w-44 rounded-lg bg-slate-100 dark:bg-white/10" />
        <div className="mt-4 flex justify-center gap-3">
          <div className="h-8 w-28 rounded-full bg-slate-100 dark:bg-white/10" />
          <div className="h-8 w-24 rounded-full bg-slate-100 dark:bg-white/10" />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-white/10" />
          <div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-white/10" />
          <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-white/10" />
        </div>
      </div>

      <div className="flex items-center gap-5 px-2">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-100 dark:bg-white/10 sm:h-[72px] sm:w-[72px]" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-40 rounded-md bg-slate-100 dark:bg-white/10" />
            <div className="h-5 w-16 rounded-md bg-slate-100 dark:bg-white/10" />
          </div>
          <div className="h-3 w-full max-w-56 rounded-full bg-slate-100 dark:bg-white/10" />
        </div>
      </div>

      <div>
        <div className="mb-3 h-3 w-24 rounded-full bg-slate-100 dark:bg-white/10" />
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl bg-slate-100 dark:bg-white/10 sm:h-28" />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 h-3 w-44 rounded-full bg-slate-100 dark:bg-white/10" />
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-white/10 sm:h-16 sm:w-16" />
              <div className="h-2.5 w-12 rounded-full bg-slate-100 dark:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
