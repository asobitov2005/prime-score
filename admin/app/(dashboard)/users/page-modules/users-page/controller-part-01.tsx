"use client";
import type { BaseScope } from "./base";
import { getClientAdminAccessToken, useEffect, useRef, useState } from "../dependencies";
import { API_BASE, UserRow } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const [users, setUsers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [actionsOpen, setActionsOpen] = useState(false);

  const [bulkMsg, setBulkMsg] = useState("");

  const [bulkLoading, setBulkLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);

  const [createLoading, setCreateLoading] = useState(false);

  const [createMsg, setCreateMsg] = useState("");

  const [createError, setCreateError] = useState("");

  const [createForm, setCreateForm] = useState({
      telegram_id: "",
      phone: "",
      first_name: "",
      last_name: "",
      username: "",
      avatar_url: "",
      show_on_leaderboard: true,
      is_premium: false,
      premium_days: "0",
    });

  const actionsRef = useRef<HTMLDivElement>(null);

  const [premiumFilter, setPremiumFilter] = useState("all");

  const [leaderboardFilter, setLeaderboardFilter] = useState("all");

  const [search, setSearch] = useState("");

  const hasFilters = premiumFilter !== "all" || leaderboardFilter !== "all" || search !== "";

  const clearFilters = () => { setPremiumFilter("all"); setLeaderboardFilter("all"); setSearch(""); };

  useEffect(() => {
      if (!createOpen) {
        return;
      }
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }, [createOpen]);

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
            botContactAt: u.bot_contact_at ?? null,
            firstLoginAt: u.first_login_at ?? null,
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
      if (
        search &&
        !u.name.toLowerCase().includes(search.toLowerCase()) &&
        !(u.username ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !(u.phone ?? "").toLowerCase().includes(search.toLowerCase())
      ) return false;
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

  const createUser = async () => {
      setCreateLoading(true);
      setCreateError("");
      setCreateMsg("");
      try {
        const token = getClientAdminAccessToken();
        if (!token) throw new Error("No token");
        const res = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            telegram_id: Number(createForm.telegram_id),
            phone: createForm.phone,
            first_name: createForm.first_name,
            last_name: createForm.last_name || null,
            username: createForm.username || null,
            avatar_url: createForm.avatar_url || null,
            show_on_leaderboard: createForm.show_on_leaderboard,
            is_premium: createForm.is_premium,
            premium_days: Number(createForm.premium_days || 0),
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.detail ?? "Failed to create user.");
        }
        const data = await res.json();
        setCreateMsg("User created successfully.");
        setCreateOpen(false);
        setCreateForm({
          telegram_id: "",
          phone: "",
          first_name: "",
          last_name: "",
          username: "",
          avatar_url: "",
          show_on_leaderboard: true,
          is_premium: false,
          premium_days: "0",
        });
        setSelectedIds(new Set());
        await fetchUsers();
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "Failed to create user.");
      } finally {
        setCreateLoading(false);
      }
    };

  const noneSelected = selectedIds.size === 0;

  return { users, setUsers, loading, setLoading, loadError, setLoadError, selectedIds, setSelectedIds, actionsOpen, setActionsOpen, bulkMsg, setBulkMsg, bulkLoading, setBulkLoading, createOpen, setCreateOpen, createLoading, setCreateLoading, createMsg, setCreateMsg, createError, setCreateError, createForm, setCreateForm, actionsRef, premiumFilter, setPremiumFilter, leaderboardFilter, setLeaderboardFilter, search, setSearch, hasFilters, clearFilters, fetchUsers, filtered, allSelected, toggleAll, toggle, grantPremium, createUser, noneSelected };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
