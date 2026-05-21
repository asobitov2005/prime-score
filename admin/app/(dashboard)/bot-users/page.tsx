"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardContent, SectionHeader, buttonClassName, formatDate } from "@/components/ui";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

type BotUserRow = {
  id: string;
  telegramId: number;
  linkedUserId: string | null;
  firstName: string;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
  startCount: number;
  firstStartedAt: string | null;
  lastStartedAt: string | null;
  botContactAt: string | null;
  firstLoginAt: string | null;
  isPremium: boolean;
  createdAt: string | null;
};

type StatusFilter = "all" | "started_only" | "waiting" | "logged_in";

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

function displayName(user: BotUserRow): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.phone || "Unnamed user";
}

function statusOf(user: BotUserRow): StatusFilter {
  if (!user.botContactAt && !user.firstLoginAt) return "started_only";
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

      const res = await fetch(`${API_BASE}/telegram-users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail ?? "Bot userlarni yuklab bo'lmadi.");
      }

      const data = await res.json();
      setUsers(
        data.map((user: any) => ({
          id: user.id,
          telegramId: user.telegram_id,
          linkedUserId: user.linked_user_id ?? null,
          firstName: user.first_name ?? "",
          lastName: user.last_name ?? null,
          username: user.username ?? null,
          phone: user.phone ?? null,
          avatarUrl: user.avatar_url ?? null,
          startCount: Number(user.start_count ?? 0),
          firstStartedAt: user.first_started_at ?? null,
          lastStartedAt: user.last_started_at ?? null,
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
    const startedOnly = users.filter((user) => statusOf(user) === "started_only").length;
    const waiting = users.filter((user) => statusOf(user) === "waiting").length;
    const loggedIn = users.filter((user) => statusOf(user) === "logged_in").length;
    return { total: users.length, startedOnly, waiting, loggedIn };
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
        description="Telegram botga kirgan userlar: start bosganlar, contact yuborganlar va birinchi login qilganlar."
        actions={<Link href="/users" className={buttonClassName({ variant: "outline", size: "sm" })}>All users</Link>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Telegram users" value={metrics.total} />
        <MetricCard label="Started only" value={metrics.startedOnly} />
        <MetricCard label="Waiting login" value={metrics.waiting} tone="warning" />
        <MetricCard label="Logged in" value={metrics.loggedIn} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filterButton("all", "All")}
        {filterButton("started_only", "Started only")}
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
                  <th className="border-b border-border px-3 py-3 font-medium">Last seen</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Bot contact</th>
                  <th className="border-b border-border px-3 py-3 font-medium">First login</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Premium</th>
                  <th className="border-b border-border px-3 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={7}>No bot users found.</td>
                  </tr>
                ) : null}
                {filtered.map((user) => {
                  const name = displayName(user);
                  const status = statusOf(user);
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
                        <Badge
                          tone={status === "logged_in" ? "success" : status === "waiting" ? "warning" : "neutral"}
                          className="text-[10px] uppercase font-black tracking-widest"
                        >
                          {status === "logged_in" ? "Logged in" : status === "waiting" ? "Waiting login" : "Started only"}
                        </Badge>
                      </td>
                      <td className="border-b border-border/50 px-3 py-4 text-[11px] font-bold uppercase text-muted-foreground">
                        <div>{user.lastStartedAt ? formatDate(user.lastStartedAt) : "-"}</div>
                        <div className="mt-1 text-[10px] tracking-widest text-muted-foreground/80">{user.startCount} starts</div>
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
                        {user.linkedUserId ? (
                          <Link href={`/users/${user.linkedUserId}`} className={buttonClassName({ variant: "outline", size: "sm" })}>View</Link>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No account</span>
                        )}
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
