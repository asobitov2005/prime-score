"use client";

import { ReactNode, cn } from "./speaking-result-summary-dependencies";

export function CriterionCard({
  icon,
  iconBg,
  label,
  score,
  progress,
  barClass,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  score: string;
  progress: number;
  barClass: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-2.5 sm:p-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconBg)}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-tight text-[#64748B] sm:text-xs">{label}</p>
          <p className="text-lg font-bold leading-none text-[#0F172A] sm:text-xl">{score}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function MetaCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-[10px] px-2.5 py-2.5 sm:px-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EFFF] sm:h-8 sm:w-8">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-[#64748B] sm:text-[11px]">{label}</p>
        <p className="break-words text-xs font-bold leading-snug text-[#0F172A] sm:text-sm">{value}</p>
      </div>
    </div>
  );
}

export function FeedbackBlock({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-[#64748B] sm:text-sm sm:leading-6">{text}</p>
    </div>
  );
}
