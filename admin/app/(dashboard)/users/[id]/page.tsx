"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle, SectionHeader, buttonClassName } from "@/components/ui";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

type UserDetail = {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  premium_until: string | null;
  show_on_leaderboard: boolean;
  last_active_at: string | null;
  created_at: string | null;
  attempts_total: number;
  attempts_completed: number;
  average_band: number | null;
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function daysLeft(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff <= 0) return "(muddati tugagan)";
  return `(${diff} kun qoldi)`;
}

const IconChevron = ({ open }: { open: boolean }) => <svg className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;
const IconCrown = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8l4 4 4-7 4 7 4-4v11H4V8Z" /></svg>;
const IconEye = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
const IconEyeOff = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A2.5 2.5 0 0 0 13.42 13.42" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.2 6.2C4 7.8 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3.02-.25 4.27-.68" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.88 4.42A10.88 10.88 0 0 1 12 4.5c6 0 9.5 7.5 9.5 7.5a20.4 20.4 0 0 1-3.3 4.52" /></svg>;
const IconTrash = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
const IconBan = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8.5 15.5 15.5" /></svg>;
const IconAlert = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86 2.82 17a2 2 0 0 0 1.71 3h15.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const premiumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) { if (premiumRef.current && !premiumRef.current.contains(e.target as Node)) setPremiumOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const token = useCallback(() => getClientAdminAccessToken(), []);

  const fetchUser = useCallback(() => {
    if (!id) return;
    const t = token();
    if (!t) { setLoading(false); return; }
    fetch(`${API_BASE}/users/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(setUser)
      .catch(() => setError("Foydalanuvchini yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const doAction = async (fn: () => Promise<Response>, successMsg: string) => {
    setActionLoading(true); setActionMsg("");
    try {
      const res = await fn();
      if (!res.ok) throw new Error();
      setActionMsg(successMsg);
      fetchUser();
    } catch { setActionMsg("Xatolik yuz berdi."); }
    finally { setActionLoading(false); }
  };

  const grantPremium = (days: number) => {
    setPremiumOpen(false);
    doAction(
      () => fetch(`${API_BASE}/users/bulk-premium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ user_ids: [id], days }),
      }),
      `${days} kunlik premium berildi.`
    );
  };

  const revokePremium = () => {
    doAction(
      () => fetch(`${API_BASE}/users/${id}/revoke-premium`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      }),
      "Premium bekor qilindi."
    );
  };

  const deleteUser = () => {
    setDeleteOpen(true);
  };

  const confirmDeleteUser = () => {
    setDeleteOpen(false);
    void doAction(
      () => fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      }),
      "User deleted."
    ).then(() => router.push("/users"));
  };

  const toggleLeaderboard = () => {
    doAction(
      () => fetch(`${API_BASE}/users/${id}/toggle-leaderboard`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      }),
      "Leaderboard holati o'zgartirildi."
    );
  };

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-8 w-48 bg-muted rounded-lg" /><div className="h-40 bg-muted rounded-xl" /></div>;
  if (error || !user) return (
    <div className="space-y-4">
      <Link href="/users" className={buttonClassName({ variant: "ghost", size: "sm" })}>← Orqaga</Link>
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm font-medium text-red-600">{error || "User topilmadi."}</div>
    </div>
  );

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const completionRate = user.attempts_total > 0 ? Math.round((user.attempts_completed / user.attempts_total) * 100) : 0;
  const memberSince = new Date(user.created_at ?? "");
  const memberDays = Math.floor((Date.now() - memberSince.getTime()) / 86400000);
  const premiumExpired = user.premium_until ? new Date(user.premium_until).getTime() < Date.now() : false;

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader
        eyebrow="User Detail"
        title={fullName}
        description={user.username ? `@${user.username}` : user.phone ?? "—"}
        actions={<Link href="/users" className={buttonClassName({ variant: "outline", size: "sm" })}>← Back to Users</Link>}
      />

      {actionMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-medium text-emerald-600">{actionMsg}</div>
      )}

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-black text-primary">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={fullName || "User"} className="h-full w-full object-cover" />
              ) : (
                (fullName || user.username || "?").charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
                {user.is_premium && !premiumExpired && <Badge tone="success" className="text-[10px] uppercase font-black tracking-widest">Premium</Badge>}
                {premiumExpired && <Badge tone="warning" className="text-[10px] uppercase font-black tracking-widest">Premium expired</Badge>}
                {!user.is_premium && !premiumExpired && <Badge tone="neutral" className="text-[10px] uppercase font-black tracking-widest">Free</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {user.phone && <span>📱 {user.phone}</span>}
                {user.username && <span>@{user.username}</span>}
                <span>Telegram ID: {user.telegram_id}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative" ref={premiumRef}>
            <button
              onClick={() => setPremiumOpen(!premiumOpen)}
              disabled={actionLoading}
              className={buttonClassName({ variant: "solid", size: "sm" })}
            >
              <span className="inline-flex items-center gap-2">
                <IconCrown />
                Grant premium
              </span>
              <IconChevron open={premiumOpen} />
            </button>
            {premiumOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
                <button onClick={() => grantPremium(7)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors">7 days</button>
                <button onClick={() => grantPremium(10)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">10 days</button>
                <button onClick={() => grantPremium(30)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">30 days</button>
                <button onClick={() => grantPremium(90)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">90 days</button>
                <button onClick={() => grantPremium(180)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">180 days</button>
                <button onClick={() => grantPremium(365)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">1 year</button>
              </div>
            )}
          </div>

          {user.is_premium && (
            <button onClick={revokePremium} disabled={actionLoading} className={buttonClassName({ variant: "danger", size: "sm" })}>
              <span className="inline-flex items-center gap-2">
                <IconBan />
                Revoke premium
              </span>
            </button>
          )}

          <button onClick={toggleLeaderboard} disabled={actionLoading} className={buttonClassName({ variant: "outline", size: "sm" })}>
            <span className="inline-flex items-center gap-2">
              {user.show_on_leaderboard ? <IconEyeOff /> : <IconEye />}
              {user.show_on_leaderboard ? "Hide from leaderboard" : "Show on leaderboard"}
            </span>
          </button>

          <button onClick={deleteUser} disabled={actionLoading} className={buttonClassName({ variant: "danger", size: "sm" })}>
            <span className="inline-flex items-center gap-2">
              <IconTrash />
              Delete user
            </span>
          </button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Urinishlar" value={String(user.attempts_total)} sub={`${user.attempts_completed} yakunlangan`} />
        <StatBox label="O'rtacha ball" value={user.average_band != null ? user.average_band.toFixed(1) : "—"} sub="barcha testlar" />
        <StatBox label="Completion rate" value={`${completionRate}%`} sub={`${user.attempts_completed}/${user.attempts_total}`} />
        <StatBox label="Platformada" value={`${memberDays} kun`} sub={`${fmtDate(user.created_at)} dan`} />
      </div>

      {/* Details Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">Account ma&apos;lumotlari</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="ID" value={user.id} mono />
            <InfoRow label="Telegram ID" value={String(user.telegram_id)} mono />
            <InfoRow label="Ism" value={fullName} />
            <InfoRow label="Username" value={user.username ? `@${user.username}` : "—"} />
            <InfoRow label="Telefon" value={user.phone ?? "—"} />
            <InfoRow label="Ro'yxatdan o'tgan" value={fmt(user.created_at)} />
            <InfoRow label="Oxirgi faollik" value={fmt(user.last_active_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">Subscription</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Status" value={user.is_premium && !premiumExpired ? "Premium" : premiumExpired ? "Expired" : "Free"} badge={user.is_premium && !premiumExpired ? "success" : premiumExpired ? "warning" : "neutral"} />
            <InfoRow label="Premium tugashi" value={user.premium_until ? `${fmtDate(user.premium_until)} ${daysLeft(user.premium_until)}` : "—"} />
            <InfoRow label="Leaderboard" value={user.show_on_leaderboard ? "Ko'rinadi" : "Yashirin"} badge={user.show_on_leaderboard ? "success" : "paused"} />
          </CardContent>
        </Card>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                <IconAlert />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground">Delete user?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will deactivate the account and remove access immediately.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 text-sm text-muted-foreground">
              The user can register again from Telegram later.
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
              <button type="button" onClick={() => setDeleteOpen(false)} className={buttonClassName({ variant: "outline", size: "sm" })}>
                Cancel
              </button>
              <button type="button" onClick={confirmDeleteUser} disabled={actionLoading} className={buttonClassName({ variant: "danger", size: "sm" })}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-foreground mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: "success" | "neutral" | "paused" | "warning" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30 last:border-none">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">{label}</span>
      {badge ? (
        <Badge tone={badge === "warning" ? "warning" : badge} className="text-[10px] uppercase font-black tracking-widest">{value}</Badge>
      ) : (
        <span className={`text-sm font-medium text-foreground text-right truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
      )}
    </div>
  );
}
