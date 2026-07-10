"use client";

import { Check, ChevronDown, LucideIcon, cn, useEffect, useRef, useState } from "./dependencies";



export type SortOption = "popular" | "az";

export type TopicTone = "purple" | "blue" | "green" | "orange" | "pink";

export type TopicVisual = {
  icon: LucideIcon;
  tone: TopicTone;
};

export const toneStyles: Record<
  TopicTone,
  { icon: string; ring: string; selected: string }
> = {
  purple: {
    icon: "bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/15 dark:text-[#A78BFA]",
    ring: "border-[#C4B5FD] dark:border-[#6D4CFF]/35",
    selected:
      "border-[#6D4CFF] bg-[#FBFAFF] shadow-[0_0_0_1px_rgba(109,76,255,0.18),0_18px_40px_-32px_rgba(109,76,255,0.45)] dark:border-[#8B5CF6] dark:bg-[#6D4CFF]/10 dark:shadow-[0_0_0_1px_rgba(139,92,246,0.28),0_18px_40px_-32px_rgba(109,76,255,0.35)]",
  },
  blue: {
    icon: "bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-400",
    ring: "border-[#BFDBFE] dark:border-blue-500/30",
    selected: "border-[#2563EB] bg-[#F8FAFF] dark:border-blue-500 dark:bg-blue-500/10",
  },
  green: {
    icon: "bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-500/10 dark:text-emerald-400",
    ring: "border-[#A7F3D0] dark:border-emerald-500/30",
    selected: "border-[#10B981] bg-[#F8FAFC] dark:border-emerald-500 dark:bg-emerald-500/10",
  },
  orange: {
    icon: "bg-[#FFF7ED] text-[#F97316] dark:bg-orange-500/10 dark:text-orange-400",
    ring: "border-[#FED7AA] dark:border-orange-500/30",
    selected: "border-[#F97316] bg-[#FFFBF5] dark:border-orange-500 dark:bg-orange-500/10",
  },
  pink: {
    icon: "bg-[#FDF2F8] text-[#EC4899] dark:bg-pink-500/10 dark:text-pink-400",
    ring: "border-[#FBCFE8] dark:border-pink-500/30",
    selected: "border-[#EC4899] bg-[#FDF2F8] dark:border-pink-500 dark:bg-pink-500/10",
  },
};

export const partFilterOptions = [
  { value: "1", label: "Part 1" },
  { value: "2", label: "Part 2" },
  { value: "3", label: "Part 3" },
] as const;

export const sortFilterOptions = [
  { value: "popular", label: "Popular" },
  { value: "az", label: "A–Z" },
] as const;

export function TopicFilterDropdown({
  ariaLabel,
  value,
  options,
  onChange,
  className,
}: {
  ariaLabel: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-left shadow-[0_8px_20px_-18px_rgba(15,23,42,0.2)] transition-all dark:bg-slate-950 dark:shadow-none",
          open
            ? "border-[#C4B5FD] ring-4 ring-[#6D4CFF]/10 dark:border-[#6D4CFF]/40 dark:ring-[#6D4CFF]/10"
            : "border-slate-200 hover:border-slate-300 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:hover:border-slate-600 dark:hover:shadow-none",
        )}
      >
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedOption.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500",
            open && "rotate-180 text-[#6D4CFF] dark:text-[#A78BFA]",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full min-w-[9.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                className={cn(
                  "flex h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50",
                )}
              >
                <span>{option.label}</span>
                {active ? <Check className="h-4 w-4 text-[#6D4CFF] dark:text-[#C4B5FD]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
