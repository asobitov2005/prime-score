"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Trophy, X } from "lucide-react";

export interface UserProfileModalData {
  avatarUrl?: string | null;
  username: string;
  level: number;
  periodXp: number;
  rank: number;
  currentStreak: number;
  averageScore: number | null;
  periodLabel: string;
}

interface LeaderboardUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileModalData | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function LeaderboardUserProfileModal({ isOpen, onClose, user }: LeaderboardUserProfileModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const stats = [
    { label: "Level", value: String(user.level) },
    { label: `${user.periodLabel} XP`, value: new Intl.NumberFormat("en-US").format(user.periodXp) },
    { label: "Streak", value: `${user.currentStreak} days` },
    { label: "Avg. score", value: user.averageScore?.toFixed(1) ?? "—" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Close profile modal"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${user.username} leaderboard profile`}
        className="relative z-10 w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl sm:rounded-3xl"
        style={{ maxHeight: "min(34rem, calc(100dvh - 2rem))" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center pt-2 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xl font-semibold text-muted-foreground">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.username} fill sizes="80px" className="object-cover" />
            ) : initials(user.username)}
          </div>
          <h2 className="mt-4 max-w-full truncate pr-8 text-xl font-semibold tracking-tight">{user.username}</h2>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Trophy className="h-4 w-4" />
            #{user.rank} {user.periodLabel}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/70 bg-muted/35 p-4">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-1.5 truncate text-lg font-semibold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
