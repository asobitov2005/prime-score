"use client";

import { ADMIN_PUBLIC_API_BASE_URL, cn, useEffect, useRef, useState } from "./dependencies";



export type UserRow = {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
  premiumState: "active" | "expired" | "free";
  premiumUntil: string | null;
  botContactAt: string | null;
  firstLoginAt: string | null;
  leaderboardVisible: boolean;
  attempts: number;
  completed: number;
  band: string;
  lastActiveAt: string;
  createdAt: string;
};

export const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

export /* Icons */
const IconCrown = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M2 20h20M5 17l-1-10 5 4 3-6 3 6 5-4-1 10z"/></svg>;

export const IconX = () => <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;

export const IconSearch = () => <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;

export const IconChevron = ({ open }: { open: boolean }) => <svg className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;

export function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={cn(
        "h-9 pl-3 pr-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all",
        value !== "all" ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
      )}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">{label}</span>
        {current?.label ?? "All"}
        <IconChevron open={open} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
          {options.map((opt) => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
              className={cn("w-full px-3 py-2 text-sm text-left transition-colors flex items-center justify-between",
                value === opt.id ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
              )}>
              {opt.label}
              {value === opt.id && <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
