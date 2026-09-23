"use client";

import { useAuthStore } from "@/store/auth-store";

export function DashboardGreeting() {
  const name = useAuthStore((state) => state.name);
  const displayName = name?.trim() || "Candidate";

  return (
    <header>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Your practice space</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Welcome back, {displayName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">A clear next step is better than a crowded dashboard.</p>
    </header>
  );
}
