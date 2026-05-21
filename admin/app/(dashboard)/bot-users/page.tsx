"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardContent, SectionHeader, buttonClassName, formatDate } from "@/components/ui";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

type BotUserRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
  botContactAt: string | null;
  firstLoginAt: string | null;
  isPremium: boolean;
  createdAt: string | null;
};

type StatusFilter = "all" | "waiting" | "logged_in";

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

function displayName(user: BotUserRow): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.phone || "Unnamed user";
}

function statusOf(user: BotUserRow): StatusFilter {
  return user.firstLoginAt ? "logged_in" : "waiting";
}

export default function BotUsersPage() {
  const [users, setUsers] = useState<BotUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchBotUsers = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const token = getClientAdminAccessToken();
      if (!token) {
        setLoadError("Admin session topilmadi. Qayta login qiling.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail ?? "Bot userlarni yuklab bo'lmadi.");
      }

      const data = await res.json();
      setUsers(
        data
          .filter((user: any) => Boolean(user.bot_contact_at))
          .map((user: any) => ({
            id: user.id,
            firstName: user.first_name ?? "",
            lastName: user.last_name ?? null,
            username: user.username ?? null,
            phone: user.phone ?? null,
            avatarUrl: user.avatar_url ?? null,
            botContactAt: user.bot_contact_at ?? null,
            firstLoginAt: user.first_login_at ?? null,
            isPremium: Boolean(user.is_premium),
            createdAt: user.created_at ?? null,
          }))
      );
    } catch (error) {
      setUsers([]);
      setLoadError(error instanceof Error ? error.message : "Bot userlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBotUsers();
  }, []);

  const metrics = useMemo(() => {
    const waiting = users.filter((user) => !user.firstLoginAt).length;
    const loggedIn = users.length - waiting;
    return { total: users.length, waiting, loggedIn };
  }, [users]);

  const filtered = users.filter((user) => {
    if (statusFilter !== "all" && statusOf(user) !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      displayName(user).toLowerCase().includes(query) ||
      (user.username ?? "").toLowerCase().includes(query) ||
      (user.phone ?? "").toLowerCase().includes(query)
    );
  });

  const filterButton = (value: StatusFilter, label: string) => (
    <button
      type="button"
      onClick={() => setStatusFilter(value)}
      className={cn(
        "h-9 rounded-md border px-3 text-sm font-semibold transition-colors",
        statusFilter === value
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Telegram"
        title="Bot users"
        description="Telegram bot orqali phone contact yuborgan userlar va ularning birinchi login holati."
        actions={<Link href="/users" className={buttonClassName({ variant: "outline", size: "sm" })}>All users</Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Bot contacts" value={metrics.total} />
        <MetricCard label="Waiting login" value={metrics.waiting} tone="warning" />
        <MetricCard label="Logged in" value={metrics.loggedIn} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filterButton("all", "All")}
        {filterButton("waiting", "Waiting login")}
        {filterButton("logged_in", "Logged in")}
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, username, phone..."
          className="h-9 min-w-64 rounded-md border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary/40"
        />
        <Badge tone="neutral" className="ml-auto">{filtered.length} users</Badge>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{loadError}</div>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-muted/30 text-left text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <th className="border-b border-border px-3 py-3 font-medium">User</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Status</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Bot contact</th>
                  <th className="border-b border-border px-3 py-3 font-medium">First login</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Premium</th>
                  <th className="border-b border-border px-3 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={6}>No bot users found.</td>
                  </tr>
                ) : null}
                {filtered.map((user) => {
                  const name = displayName(user);
                  const waiting = !user.firstLoginAt;
                  return (
                    <tr key={user.id} className="align-top transition-colors hover:bg-muted/30">
                      <td className="border-b border-border/50 px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">
                            {user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.avatarUrl} alt={name} className="h-full w-full object-cover" />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{name}</div>
                            <div className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {user.username ? `@${user.username}` : user.phone ?? "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        <Badge tone={waiting ? "warning" : "success"} className="text-[10px] uppercase font-black tracking-widest">
                          {waiting ? "Waiting login" : "Logged in"}
                        </Badge>
                      </td>
                      <td className="border-b border-border/50 px-3 py-4 text-[11px] font-bold uppercase text-muted-foreground">
                        {user.botContactAt ? formatDate(user.botContactAt) : "-"}
                      </td>
                      <td className="border-b border-border/50 px-3 py-4 text-[11px] font-bold uppercase text-muted-foreground">
                        {user.firstLoginAt ? formatDate(user.firstLoginAt) : "-"}
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        <Badge tone={user.isPremium ? "success" : "neutral"} className="text-[10px] uppercase font-black tracking-widest">
                          {user.isPremium ? "Premium" : "Free"}
                        </Badge>
                      </td>
                      <td className="border-b border-border/50 px-3 py-4">
                        <Link href={`/users/${user.id}`} className={buttonClassName({ variant: "outline", size: "sm" })}>View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <div
          className={cn(
            "mt-2 text-3xl font-black",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "neutral" && "text-foreground"
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
