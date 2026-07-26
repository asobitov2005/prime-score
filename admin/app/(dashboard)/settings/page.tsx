"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle, SectionHeader } from "@/components/ui";
import { AdminSettingsLoadingSkeleton } from "@/components/loading-skeletons";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

type Settings = {
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

function toLocalPhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Broadcast dialog state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bcTitle, setBcTitle] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcTgText, setBcTgText] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const token = () => getClientAdminAccessToken();
  const updateAdminPhone = (value: string) => setAdminPhone(value.replace(/\D/g, "").slice(0, 9));

  const fetchSettings = () => {
    const t = token();
    if (!t) { setLoading(false); return; }
    fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((nextSettings: Settings) => {
        setSettings(nextSettings);
        setAdminPhone(toLocalPhone(nextSettings.admin_phone_number));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const doAction = async (key: string, url: string, method = "POST", payload?: any) => {
    setActionLoading(key); setActionMsg("");
    try {
      const res = await fetch(`${API_BASE}${url}`, { 
        method, 
        headers: { 
          Authorization: `Bearer ${token()}`,
          ...(payload ? { "Content-Type": "application/json" } : {})
        },
        body: payload ? JSON.stringify(payload) : undefined
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActionMsg(data.message ?? "Done.");
      fetchSettings();
    } catch { setActionMsg("Action failed."); }
    finally { setActionLoading(null); }
  };

  const downloadCSV = async () => {
    setActionLoading("csv"); setActionMsg("");
    try {
      const res = await fetch(`${API_BASE}/export-users-csv`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setActionMsg("CSV downloaded successfully.");
    } catch { setActionMsg("Failed to download CSV."); }
    finally { setActionLoading(null); }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle || !bcBody) return;
    await doAction("broadcast", "/broadcast-notification", "POST", {
      title: bcTitle,
      body: bcBody,
      telegram_text: bcTgText || null,
    });
    setShowBroadcast(false);
    setBcTitle(""); setBcBody(""); setBcTgText("");
  };

  const togglePaymentStatus = async () => {
    if (!settings) return;
    await doAction("toggle_payment", "/settings", "PATCH", {
      payment_paused: !settings.payment_paused
    });
  };

  const handleSecuritySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;

    const currentPhone = toLocalPhone(settings.admin_phone_number);
    const phoneChanged = adminPhone !== currentPhone;
    const passwordChanged = newPassword.length > 0;

    if (!phoneChanged && !passwordChanged) {
      setActionMsg("Nothing to update.");
      return;
    }
    if (adminPhone.length !== 9) {
      setActionMsg("Phone number must be 9 digits.");
      return;
    }
    if (!currentPassword) {
      setActionMsg("Current password is required.");
      return;
    }
    if (passwordChanged && newPassword.length < 8) {
      setActionMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setActionMsg("New password confirmation does not match.");
      return;
    }

    setActionLoading("security");
    setActionMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/security`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          phone_number: phoneChanged ? adminPhone : null,
          new_password: passwordChanged ? newPassword : null,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail ?? "Admin account update failed.");
      }
      const payload = await res.json();
      setActionMsg(payload.message ?? "Admin account updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      fetchSettings();
    } catch (error) {
      setActionMsg(error instanceof Error ? error.message : "Admin account update failed.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <AdminSettingsLoadingSkeleton />;

  if (!settings) return <div className="text-sm text-muted-foreground">Failed to load settings.</div>;

  return (
    <div className="space-y-6 max-w-4xl relative">
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

      {/* Admin Account */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-bold">Admin Account</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSecuritySubmit}>
            <div className="space-y-2">
              <label htmlFor="admin-phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone number</label>
              <input
                id="admin-phone"
                value={adminPhone}
                onChange={(event) => updateAdminPhone(event.target.value)}
                inputMode="numeric"
                maxLength={9}
                placeholder="xxxx"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">Telegram bot orqali ro&apos;yxatdan o&apos;tgan raqam.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-current-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current password</label>
              <input
                id="admin-current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-new-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New password</label>
              <input
                id="admin-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Leave empty to keep current"
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-confirm-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirm password</label>
              <input
                id="admin-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-4 border-t border-border/30 pt-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{settings.admin_username}</p>
                <p className="text-[10px] text-muted-foreground">{settings.admin_email}</p>
              </div>
              <button
                type="submit"
                disabled={actionLoading !== null}
                className={cn(
                  "shrink-0 h-9 px-4 rounded-lg text-xs font-semibold transition-all border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                  actionLoading !== null && "opacity-40 cursor-not-allowed"
                )}
              >
                {actionLoading === "security" ? "Saving..." : "Save Account"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-bold">Integrations</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/30">
          <IntegrationRow
            emoji="🤖" title="Telegram Bot" desc="Login codes, notifications, announcements"
            status={settings.telegram_bot_connected} statusLabel={settings.telegram_bot_connected ? "Connected" : "Not configured"}
          />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-lg", !settings.payment_paused ? "bg-emerald-500/10" : "bg-muted")}>💳</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Payment System</p>
                <p className="text-[10px] text-muted-foreground">Click, Payme — online payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={!settings.payment_paused ? "success" : "paused"} className="text-[10px] uppercase font-black tracking-widest">
                {!settings.payment_paused ? "Active" : "Paused"}
              </Badge>
              <button 
                onClick={togglePaymentStatus} 
                disabled={actionLoading === "toggle_payment"}
                className={cn("px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors",
                  settings.payment_paused ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                )}
              >
                {settings.payment_paused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>
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
            disabled={actionLoading !== null}
          />
          <ActionRow
            title="Broadcast Notification"
            desc="Send a custom notification to all users via app and Telegram."
            btnLabel="Open Broadcaster"
            onClick={() => setShowBroadcast(true)}
            disabled={actionLoading !== null}
          />
          <ActionRow
            title="Export Users CSV"
            desc="Download all user data as CSV for analytics or CRM import."
            btnLabel={actionLoading === "csv" ? "Exporting..." : "Download CSV"}
            onClick={downloadCSV}
            disabled={actionLoading !== null}
          />
          <ActionRow
            title="Sync Leaderboard"
            desc="Recalculate and refresh leaderboard rankings from attempt data."
            btnLabel={actionLoading === "leaderboard" ? "Syncing..." : "Sync Now"}
            onClick={() => doAction("leaderboard", "/sync-leaderboard")}
            disabled={actionLoading !== null}
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
            onClick={() => {
              if(window.confirm("Are you sure you want to logout all users immediately?")) {
                doAction("logout", "/clear-sessions");
              }
            }}
            disabled={actionLoading !== null}
            danger
          />
          <ActionRow
            title="Purge Draft Tests"
            desc="Delete all tests in draft status that have no attempts."
            btnLabel={actionLoading === "purge" ? "Purging..." : "Purge Drafts"}
            onClick={() => {
              if(window.confirm("Are you sure you want to permanently delete all draft tests with no attempts?")) {
                doAction("purge", "/draft-tests", "DELETE");
              }
            }}
            disabled={actionLoading !== null}
            danger
          />
        </CardContent>
      </Card>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Broadcast Notification</CardTitle>
            </CardHeader>
            <form onSubmit={handleBroadcastSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title</label>
                  <input required value={bcTitle} onChange={e => setBcTitle(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="E.g. Scheduled Maintenance" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">App Message Body</label>
                  <textarea required value={bcBody} onChange={e => setBcBody(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="Message shown in the web app" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Telegram Text (Optional)</label>
                  <textarea value={bcTgText} onChange={e => setBcTgText(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="HTML formatting allowed. Leaves empty to use Title + Body." />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowBroadcast(false)} className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading === "broadcast"} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  {actionLoading === "broadcast" ? "Sending..." : "Send to All"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
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
