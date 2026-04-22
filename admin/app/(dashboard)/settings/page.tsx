"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle, SectionHeader } from "@/components/ui";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

type Settings = {
  project_name: string;
  environment: string;
  timezone: string;
  payment_paused: boolean;
  max_sessions: number;
  telegram_bot_connected: boolean;
  total_users: number;
  total_tests: number;
  total_attempts: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = () => getClientAdminAccessToken();

  const fetchSettings = () => {
    const t = token();
    if (!t) { setLoading(false); return; }
    fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const doAction = async (key: string, url: string, method = "POST") => {
    setActionLoading(key); setActionMsg("");
    try {
      const res = await fetch(`${API_BASE}${url}`, { method, headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActionMsg(data.message ?? "Done.");
      fetchSettings();
    } catch { setActionMsg("Action failed."); }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-4xl">
      <div className="h-8 w-48 bg-muted rounded-lg" />
      {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-xl" />)}
    </div>
  );

  if (!settings) return <div className="text-sm text-muted-foreground">Failed to load settings.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader eyebrow="System" title="Settings" description="Manage integrations, notifications, and platform tools." />

      {actionMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-medium text-emerald-600">{actionMsg}</div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Users" value={settings.total_users} />
        <Stat label="Tests" value={settings.total_tests} />
        <Stat label="Attempts" value={settings.total_attempts} />
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-bold">Integrations</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/30">
          <IntegrationRow
            emoji="🤖" title="Telegram Bot" desc="Login codes, notifications, announcements"
            status={settings.telegram_bot_connected} statusLabel={settings.telegram_bot_connected ? "Connected" : "Not configured"}
          />
          <IntegrationRow
            emoji="💳" title="Payment System" desc="Click, Payme — online payments"
            status={!settings.payment_paused} statusLabel={settings.payment_paused ? "Paused" : "Active"}
          />
          <IntegrationRow emoji="🗄️" title="PostgreSQL" desc="Primary database" status={true} statusLabel="Connected" />
          <IntegrationRow emoji="⚡" title="Redis" desc="Session store, code cache, rate limiting" status={true} statusLabel="Connected" />
        </CardContent>
      </Card>

      {/* Notification Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">Notification Channels</CardTitle>
            <Badge tone="info" className="text-[10px] uppercase font-black tracking-widest">App + Telegram</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <NotifCard title="New Test Published" desc="All users — app & Telegram with Try Now button" active />
            <NotifCard title="Premium Gifted" desc="User — app & Telegram confirmation" active />
            <NotifCard title="Premium Revoked" desc="User — app & Telegram alert" active />
            <NotifCard title="Premium Expired" desc="Auto — user notified when subscription ends" active />
            <NotifCard title="Premium Expiring" desc="Auto — 3 days before expiry warning" active />
            <NotifCard title="Payment Success" desc="User — confirmation after payment" active={!settings.payment_paused} />
          </div>
        </CardContent>
      </Card>

      {/* Tools & Actions */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-bold">Tools</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/30">
          <ActionRow
            title="Run Premium Expiry Check"
            desc="Scan all users — deactivate expired premiums, warn expiring ones, send notifications."
            btnLabel={actionLoading === "premium" ? "Running..." : "Run Now"}
            onClick={() => doAction("premium", "/check-premiums")}
            disabled={actionLoading === "premium"}
          />
          <ActionRow
            title="Broadcast Notification"
            desc="Send a custom notification to all users via app and Telegram."
            btnLabel="Coming soon"
            disabled
          />
          <ActionRow
            title="Export Users CSV"
            desc="Download all user data as CSV for analytics or CRM import."
            btnLabel="Coming soon"
            disabled
          />
          <ActionRow
            title="Sync Leaderboard"
            desc="Recalculate and refresh leaderboard rankings from attempt data."
            btnLabel="Coming soon"
            disabled
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader><CardTitle className="text-sm font-bold text-red-500">Danger Zone</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/30">
          <ActionRow
            title="Force Logout All Users"
            desc="Invalidate all active sessions. Users must re-authenticate."
            btnLabel={actionLoading === "logout" ? "Clearing..." : "Clear All Sessions"}
            onClick={() => doAction("logout", "/clear-sessions")}
            disabled={actionLoading === "logout"}
            danger
          />
          <ActionRow
            title="Purge Draft Tests"
            desc="Delete all tests in draft status that have no attempts."
            btnLabel="Coming soon"
            disabled
            danger
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-3xl font-black text-foreground mt-1">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function IntegrationRow({ emoji, title, desc, status, statusLabel }: { emoji: string; title: string; desc: string; status: boolean; statusLabel: string }) {
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

function NotifCard({ title, desc, active }: { title: string; desc: string; active: boolean }) {
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

function ActionRow({ title, desc, btnLabel, onClick, disabled, danger }: {
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
