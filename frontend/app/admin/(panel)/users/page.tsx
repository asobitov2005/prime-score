"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminStore } from "@/store/admin-store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Crown, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  is_premium: boolean;
  last_active_at: string | null;
  created_at: string | null;
  attempts_total: number;
  attempts_completed: number;
  average_band: number | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsersPage() {
  const { accessToken } = useAdminStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => setUsers(data))
      .catch(() => setError("Foydalanuvchilarni yuklab bo'lmadi."))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Foydalanuvchilar</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">{users.length} ta foydalanuvchi</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-3 bg-muted/20 border-b border-border/30 grid grid-cols-[1fr_7rem_6rem_6rem_7rem_2rem] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div>Foydalanuvchi</div>
          <div>Telefon</div>
          <div>Urinishlar</div>
          <div>O'rtacha ball</div>
          <div>Ro'yxatdan o'tgan</div>
          <div />
        </div>

        <div className="divide-y divide-border/30">
          {users.map((user) => {
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
            return (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="px-6 py-4 grid grid-cols-[1fr_7rem_6rem_6rem_7rem_2rem] gap-4 items-center hover:bg-muted/20 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{fullName}</p>
                      {user.is_premium && (
                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>
                    {user.username && (
                      <p className="text-[11px] text-muted-foreground">@{user.username}</p>
                    )}
                  </div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">{user.phone ?? "—"}</div>
                <div className="text-sm font-bold text-foreground">{user.attempts_total}</div>
                <div className="text-sm font-bold text-foreground">
                  {user.average_band != null ? user.average_band.toFixed(1) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(user.created_at)}</div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </Link>
            );
          })}

          {users.length === 0 && !error && (
            <div className="px-6 py-16 text-center text-muted-foreground text-sm font-medium">
              Foydalanuvchilar topilmadi
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
