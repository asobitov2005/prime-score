"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Activity, CheckCircle2, TrendingUp, BookOpen, Archive, Edit3, Star } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

interface DashboardData {
  users_total: number;
  premium_users: number;
  tests_total: number;
  tests_published: number;
  tests_draft: number;
  tests_archived: number;
  attempts_total: number;
  attempts_completed: number;
  payments_pending: number;
  revenue_total: string | number;
  average_band: number | null;
}

export default function AdminDashboardPage() {
  const { accessToken } = useAdminStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => setError("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const statsCards = data
    ? [
        {
          label: "Jami foydalanuvchilar",
          value: data.users_total,
          sub: `${data.premium_users} premium`,
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-500/10",
        },
        {
          label: "Jami testlar",
          value: data.tests_total,
          sub: `${data.tests_published} published`,
          icon: FileText,
          color: "text-emerald-600",
          bg: "bg-emerald-500/10",
        },
        {
          label: "Jami urinishlar",
          value: data.attempts_total,
          sub: `${data.attempts_completed} yakunlangan`,
          icon: Activity,
          color: "text-purple-600",
          bg: "bg-purple-500/10",
        },
        {
          label: "Yakunlangan",
          value: data.attempts_completed,
          sub:
            data.attempts_total > 0
              ? `${Math.round((data.attempts_completed / data.attempts_total) * 100)}% completion rate`
              : "0% completion rate",
          icon: CheckCircle2,
          color: "text-amber-600",
          bg: "bg-amber-500/10",
        },
        {
          label: "O'rtacha ball",
          value: data.average_band != null ? data.average_band.toFixed(1) : "—",
          sub: "barcha testlar bo'yicha",
          icon: Star,
          color: "text-rose-600",
          bg: "bg-rose-500/10",
        },
      ]
    : [];

  const testStatusChart = data
    ? [
        { name: "Published", value: data.tests_published },
        { name: "Draft", value: data.tests_draft },
        { name: "Archived", value: data.tests_archived },
      ]
    : [];

  const attemptChart = data
    ? [
        { name: "Jami urinishlar", value: data.attempts_total },
        { name: "Yakunlangan", value: data.attempts_completed },
        { name: "Yakunlanmagan", value: data.attempts_total - data.attempts_completed },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">PrimeScore platformasi umumiy statistikasi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/40 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">
                    {card.label}
                  </p>
                  <p className="text-3xl font-black text-foreground tracking-tighter">{card.value}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Test Status Chart */}
        <Card className="border-border/40 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Test holati bo'yicha taqsimot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testStatusChart} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.2)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attempt Chart */}
        <Card className="border-border/40 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-600" />
              Urinishlar statistikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attemptChart} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.2)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="value" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test breakdown summary */}
      {data && (
        <Card className="border-border/40 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground">Test holatlari xulosasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <BookOpen className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-2xl font-black text-foreground">{data.tests_published}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Published</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                <Edit3 className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-2xl font-black text-foreground">{data.tests_draft}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Draft</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/40">
                <Archive className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-2xl font-black text-foreground">{data.tests_archived}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Archived</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
