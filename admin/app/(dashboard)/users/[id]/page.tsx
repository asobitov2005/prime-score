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

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
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
              👑 Premium berish <IconChevron open={premiumOpen} />
            </button>
            {premiumOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
                <button onClick={() => grantPremium(30)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors">30 kun</button>
                <button onClick={() => grantPremium(90)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">90 kun</button>
                <button onClick={() => grantPremium(180)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">180 kun</button>
                <button onClick={() => grantPremium(365)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">1 yil</button>
              </div>
            )}
          </div>

          {user.is_premium && (
            <button onClick={revokePremium} disabled={actionLoading} className={buttonClassName({ variant: "danger", size: "sm" })}>
              ❌ Premium bekor qilish
            </button>
          )}

          <button onClick={toggleLeaderboard} disabled={actionLoading} className={buttonClassName({ variant: "outline", size: "sm" })}>
            {user.show_on_leaderboard ? "🙈 Leaderboard dan yashirish" : "👁 Leaderboard da ko'rsatish"}
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
