"use client";

import { FileText, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PART_2_NOTES_MAX } from "@/lib/speaking-preparation";
import type { Part2CueCard } from "@/lib/speaking-preparation";

type Part2PreparationViewProps = {
  cueCard: Part2CueCard;
  notes: string;
  onNotesChange: (value: string) => void;
  onListenAgain: () => void;
  onEndPractice: () => void;
};

export function Part2PreparationView({
  cueCard,
  notes,
  onNotesChange,
  onListenAgain,
  onEndPractice,
}: Part2PreparationViewProps) {
  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-bold tracking-tight text-[#0F172A] sm:text-[1.85rem]">
            Part 2 Practice
          </h1>
          <p className="mt-1 text-sm text-[#64748B] sm:text-[15px]">
            You have 1 minute to prepare and up to 2 minutes to speak.
          </p>
        </div>

        <button
          type="button"
          onClick={onEndPractice}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#64748B] transition hover:border-[#CBD5E1] hover:text-[#0F172A]"
        >
          End practice
        </button>
      </div>

      <StepIndicator />

      <article className="rounded-[18px] border border-[#E5E7EB] bg-white p-7 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.14)] sm:p-8">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EFFF] text-[#7C3AED]">
            <FileText className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h2 className="text-lg font-semibold text-[#0F172A]">Cue card</h2>
        </div>

        <div className="relative rounded-[14px] border border-[#DDD6FE] bg-[#F3EFFF] px-6 py-6">
          <button
            type="button"
            onClick={onListenAgain}
            className="absolute right-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#7C3AED] bg-white px-3 text-xs font-semibold text-[#7C3AED] transition hover:bg-[#FAF5FF] sm:text-sm"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Listen again
          </button>

          <p className="max-w-[92%] pr-2 text-base font-semibold leading-7 text-[#0F172A] sm:text-[17px]">
            {cueCard.promptText}
          </p>

          <p className="mt-5 text-sm font-semibold text-[#0F172A]">You should say:</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#334155]">
            {cueCard.bulletPoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C3AED]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <label htmlFor="part-2-prep-notes" className="text-sm font-semibold text-[#0F172A]">
            Your notes (optional)
          </label>
          <div className="relative mt-2">
            <textarea
              id="part-2-prep-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value.slice(0, PART_2_NOTES_MAX))}
              placeholder="Write your ideas here..."
              className="min-h-[120px] w-full resize-y rounded-[12px] border border-[#E5E7EB] bg-white px-4 py-4 text-sm leading-6 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15"
            />
            <p className="pointer-events-none absolute bottom-3 right-3 text-xs font-medium text-[#94A3B8]">
              {notes.length} / {PART_2_NOTES_MAX}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

function StepIndicator() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <StepCard step={1} label="Preparation" time="1:00" active />
      <StepCard step={2} label="Speaking" time="Up to 2:00" />
    </div>
  );
}

function StepCard({
  step,
  label,
  time,
  active = false,
}: {
  step: number;
  label: string;
  time: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[14px] border bg-white px-4 py-3.5",
        active ? "border-[#7C3AED] shadow-[0_0_0_1px_rgba(124,58,237,0.08)]" : "border-[#E5E7EB]",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          active ? "bg-[#7C3AED] text-white" : "bg-[#F1F5F9] text-[#64748B]",
        )}
      >
        {step}
      </span>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", active ? "text-[#0F172A]" : "text-[#64748B]")}>
          {step} {label}
        </p>
        <p className="text-xs font-medium text-[#94A3B8]">{time}</p>
      </div>
    </div>
  );
}

export function Part2PreparationLoadingState() {
  return (
    <div className="mx-auto w-full max-w-[1180px] animate-pulse space-y-5">
      <div className="h-16 rounded-[18px] bg-[#F1F5F9]" />
      <div className="h-14 rounded-[14px] bg-[#F1F5F9]" />
      <div className="h-[520px] rounded-[18px] bg-[#F1F5F9]" />
    </div>
  );
}
