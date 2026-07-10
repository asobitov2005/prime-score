"use client";

import { React } from "./user-profile-modal-dependencies";

export function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors group cursor-default text-center">
      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-950/50 shadow-sm dark:shadow-inner mb-2 sm:mb-2.5">
        {icon}
      </div>
      <div className="w-full min-w-0 flex flex-col items-center">
        <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white leading-none truncate w-full">{value}</div>
        <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1 sm:mt-1.5 truncate w-full">{label}</div>
      </div>
    </div>
  );
}
