"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminStore } from "@/store/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Phone,
  Crown,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

interface AdminUser {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  is_premium: boolean;
  premium_until: string | null;
  show_on_leaderboard: boolean;
  last_active_at: string | null;
  created_at: string | null;
  attempts_total: number;
  attempts_completed: number;
  average_band: number | null;
}

function formatDate(iso: string | null, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (withTime) {
    return d.toLocaleString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAdminStore();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken || !id) return;
    fetch(`${API_BASE}/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => setError("Foydalanuvchini yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded-xl" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-2 font-semibold">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Link>
        </Button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm font-medium text-red-600">
          {error || "Foydalanuvchi topilmadi."}
        </div>
      </div>
    );
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const completionRate =
    user.attempts_total > 0
      ? Math.round((user.attempts_completed / user.attempts_total) * 100)
      : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="gap-2 font-semibold text-muted-foreground hover:text-foreground -ml-2">
        <Link href="/admin/users">
          <ArrowLeft className="h-4 w-4" /> Foydalanuvchilar
        </Link>
      </Button>

      {/* Profile Header */}
      <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-foreground">{fullName}</h1>
                {user.is_premium && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">
                    <Crown className="h-3 w-3" /> Premium
                  </span>
                )}
              </div>
              {user.username && (
                <p className="text-sm text-muted-foreground mt-1">@{user.username}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3">
                {user.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {user.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Ro'yxatdan o'tgan: {formatDate(user.created_at)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Urinishlar</p>
                <p className="text-2xl font-black text-foreground">{user.attempts_total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Yakunlangan</p>
                <p className="text-2xl font-black text-foreground">{user.attempts_completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">O'rtacha ball</p>
                <p className="text-2xl font-black text-foreground">
                  {user.average_band != null ? user.average_band.toFixed(1) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completion</p>
                <p className="text-2xl font-black text-foreground">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Info */}
      <Card className="border-border/40 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold">Batafsil ma'lumot</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ism</p>
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Telegram ID</p>
              <p className="text-sm font-semibold text-foreground">{user.telegram_id}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Telefon</p>
              <p className="text-sm font-semibold text-foreground">{user.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Username</p>
              <p className="text-sm font-semibold text-foreground">{user.username ? `@${user.username}` : "—"}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Subscription</p>
              <p className="text-sm font-semibold text-foreground">
                {user.is_premium ? (
                  <span className="text-amber-600">
                    Premium{user.premium_until ? ` · ${formatDate(user.premium_until)} gacha` : ""}
                  </span>
                ) : (
                  "Free"
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Oxirgi faollik</p>
              <p className="text-sm font-semibold text-foreground">{formatDate(user.last_active_at, true)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ro'yxatdan o'tgan</p>
              <p className="text-sm font-semibold text-foreground">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Leaderboard</p>
              <p className="text-sm font-semibold text-foreground">
                {user.show_on_leaderboard ? (
                  <span className="text-emerald-600">Ko'rinadi</span>
                ) : (
                  <span className="text-muted-foreground">Yashirin</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
