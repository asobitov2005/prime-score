"use client";

import { ADMIN_PUBLIC_API_BASE_URL, Badge, Card, CardContent, cn } from "./dependencies";



export const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

export type Settings = {
  project_name: string;
  environment: string;
  timezone: string;
  payment_paused: boolean;
  admin_username: string;
  admin_email: string;
  admin_phone_number: string | null;
  max_sessions: number;
  telegram_bot_connected: boolean;
  total_users: number;
  total_tests: number;
  total_attempts: number;
};

export function toLocalPhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-3xl font-black text-foreground mt-1">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

export function IntegrationRow({ emoji, title, desc, status, statusLabel }: { emoji: string; title: string; desc: string; status: boolean; statusLabel: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-lg", status ? "bg-emerald-500/10" : "bg-muted")}>{emoji}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Badge tone={status ? "success" : "paused"} className="text-[10px] uppercase font-black tracking-widest">{statusLabel}</Badge>
    </div>
  );
}

export function NotifCard({ title, desc, active }: { title: string; desc: string; active: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card/50">
      <div className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0", active ? "bg-emerald-500" : "bg-muted-foreground/30")} />
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export function ActionRow({ title, desc, btnLabel, onClick, disabled, danger }: {
  title: string; desc: string; btnLabel: string; onClick?: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "shrink-0 h-9 px-4 rounded-lg text-xs font-semibold transition-all",
          disabled && "opacity-40 cursor-not-allowed",
          danger
            ? "border border-red-500/30 bg-red-500/5 text-red-500 hover:bg-red-500/10"
            : "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
        )}
      >
        {btnLabel}
      </button>
    </div>
  );
}
