"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Card, CardContent, SectionHeader, buttonClassName, formatDate } from "@/components/ui";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
  premiumState: "active" | "expired" | "free";
  premiumUntil: string | null;
  leaderboardVisible: boolean;
  attempts: number;
  completed: number;
  band: string;
  lastActiveAt: string;
  createdAt: string;
};

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

/* Icons */
const IconCrown = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M2 20h20M5 17l-1-10 5 4 3-6 3 6 5-4-1 10z"/></svg>;
const IconX = () => <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;
const IconSearch = () => <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconChevron = ({ open }: { open: boolean }) => <svg className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;

function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={cn(
        "h-9 pl-3 pr-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all",
        value !== "all" ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
      )}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">{label}</span>
        {current?.label ?? "All"}
        <IconChevron open={open} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
          {options.map((opt) => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
              className={cn("w-full px-3 py-2 text-sm text-left transition-colors flex items-center justify-between",
                value === opt.id ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
              )}>
              {opt.label}
              {value === opt.id && <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [premiumFilter, setPremiumFilter] = useState("all");
  const [leaderboardFilter, setLeaderboardFilter] = useState("all");
  const [search, setSearch] = useState("");

  const hasFilters = premiumFilter !== "all" || leaderboardFilter !== "all" || search !== "";
  const clearFilters = () => { setPremiumFilter("all"); setLeaderboardFilter("all"); setSearch(""); };

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchUsers = async () => {
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
        let message = "Users listini yuklab bo'lmadi.";
        try {
          const payload = await res.json();
          message = payload?.detail ?? payload?.message ?? message;
        } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      setUsers(data.map((u: any) => {
        const isPremium = u.is_premium || false;
        const premiumUntil = u.premium_until ?? null;
        let premiumState: "active" | "expired" | "free" = "free";
        if (isPremium) premiumState = "active";
        else if (premiumUntil) premiumState = "expired";
        return {
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(" "),
          username: u.username ?? null,
          phone: u.phone ?? null,
          avatarUrl: u.avatar_url ?? null,
          premiumState,
          premiumUntil,
          leaderboardVisible: u.show_on_leaderboard ?? true,
          attempts: u.attempts_total ?? 0,
          completed: u.attempts_completed ?? 0,
          band: u.average_band != null ? u.average_band.toFixed(1) : "—",
          lastActiveAt: u.last_active_at ?? u.created_at ?? new Date().toISOString(),
          createdAt: u.created_at ?? new Date().toISOString(),
        };
      }));
    } catch (error) {
      setUsers([]);
      setLoadError(error instanceof Error ? error.message : "Users listini yuklab bo'lmadi.");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    if (premiumFilter !== "all" && u.premiumState !== premiumFilter) return false;
    if (leaderboardFilter === "visible" && !u.leaderboardVisible) return false;
    if (leaderboardFilter === "hidden" && u.leaderboardVisible) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !(u.username ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));
  const toggleAll = () => { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map((u) => u.id))); };
  const toggle = (id: string) => { setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const grantPremium = async (days: number) => {
    setBulkLoading(true); setBulkMsg(""); setActionsOpen(false);
    const ids = Array.from(selectedIds);
    try {
      const token = getClientAdminAccessToken();
      if (!token) throw new Error("No token");
      const res = await fetch(`${API_BASE}/users/bulk-premium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_ids: ids, days }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setBulkMsg(data.message ?? `${ids.length} ta userga ${days} kunlik premium berildi.`);
      setSelectedIds(new Set());
      fetchUsers();
    } catch { setBulkMsg("Xatolik yuz berdi."); }
    finally { setBulkLoading(false); }
  };

  const noneSelected = selectedIds.size === 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="People"
        title="Users"
        description="Search users, inspect sessions, and grant premium."
      />

      {/* Toolbar */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Actions */}
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => !noneSelected && setActionsOpen(!actionsOpen)}
              className={cn(
                "h-9 pl-3 pr-2 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-all",
                noneSelected ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60" : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
              )}
              title={noneSelected ? "Avval userlarni tanlang" : `${selectedIds.size} ta tanlangan`}
            >
              {!noneSelected && <Badge tone="info" className="text-[10px] px-1.5 py-0">{selectedIds.size}</Badge>}
              Actions
              <IconChevron open={actionsOpen} />
            </button>
            {actionsOpen && !noneSelected && (
              <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
                <button onClick={() => grantPremium(30)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3">
                  <IconCrown /> Premium 30 kun
                </button>
                <button onClick={() => grantPremium(90)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                  <IconCrown /> Premium 90 kun
                </button>
                <button onClick={() => grantPremium(365)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                  <IconCrown /> Premium 1 yil
                </button>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-border/60 mx-1" />

          <FilterDropdown label="Premium" value={premiumFilter} onChange={setPremiumFilter} options={[
            { id: "all", label: "All users" },
            { id: "active", label: "Premium active" },
            { id: "expired", label: "Expired" },
            { id: "free", label: "Free" },
          ]} />
          <FilterDropdown label="Leaderboard" value={leaderboardFilter} onChange={setLeaderboardFilter} options={[
            { id: "all", label: "All" },
            { id: "visible", label: "Visible" },
            { id: "hidden", label: "Hidden" },
          ]} />

          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2"><IconSearch /></div>
            <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-40 pl-8 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="h-9 px-2.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
              <IconX /> Clear
            </button>
          )}

          <div className="ml-auto">
            <Badge tone="neutral">{filtered.length} users</Badge>
          </div>
        </div>
      </div>

      {bulkMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-medium text-emerald-600">{bulkMsg}</div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{loadError}</div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground bg-muted/30">
                  <th className="border-b border-border px-4 py-3 font-medium w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-primary h-4 w-4 rounded cursor-pointer" />
                  </th>
                  <th className="border-b border-border px-3 py-3 font-medium">User</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Attempts</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Band</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Premium</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Leaderboard</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Last active</th>
                  <th className="border-b border-border px-3 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={8}>No users found.</td></tr>
                ) : null}
                {filtered.map((user) => (
                  <tr key={user.id} className={cn("align-top transition-colors", selectedIds.has(user.id) ? "bg-primary/5" : "hover:bg-muted/30")}>
                    <td className="border-b border-border/50 px-4 py-4">
                      <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggle(user.id)} className="accent-primary h-4 w-4 rounded cursor-pointer" />
                    </td>
                    <td className="border-b border-border/50 px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">
                          {user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatarUrl} alt={user.name || "User"} className="h-full w-full object-cover" />
                          ) : (
                            (user.name || user.username || "?").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{user.name || "Unnamed user"}</div>
                          <div className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {user.username ? `@${user.username}` : user.phone ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-border/50 px-3 py-4 text-sm font-semibold text-foreground">
                      {user.attempts}
                      {user.completed > 0 && <span className="text-muted-foreground font-normal"> / {user.completed} done</span>}
                    </td>
                    <td className="border-b border-border/50 px-3 py-4">
                      <Badge tone="info" className="text-xs font-bold">{user.band}</Badge>
                    </td>
                    <td className="border-b border-border/50 px-3 py-4">
                      <Badge tone={user.premiumState === "active" ? "success" : user.premiumState === "expired" ? "warning" : "neutral"} className="text-[10px] uppercase font-black tracking-widest">
                        {user.premiumState}
                      </Badge>
                    </td>
                    <td className="border-b border-border/50 px-3 py-4">
                      <Badge tone={user.leaderboardVisible ? "success" : "paused"} className="text-[10px] uppercase font-black tracking-widest">
                        {user.leaderboardVisible ? "Visible" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="border-b border-border/50 px-3 py-4 text-[11px] font-bold text-muted-foreground uppercase">{formatDate(user.lastActiveAt)}</td>
                    <td className="border-b border-border/50 px-3 py-4">
                      <a href={`/users/${user.id}`} className={buttonClassName({ variant: "outline", size: "sm" })}>View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
