"use client";
import type { BaseScope } from "./base";
import { AdminDetailLoadingSkeleton, Link, buttonClassName, getClientAdminAccessToken, useCallback, useEffect, useParams, useRef, useRouter, useState } from "../dependencies";
import { API_BASE, UserActivity, UserDetail } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { id } = useParams<{ id: string }>();

  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);

  const [activity, setActivity] = useState<UserActivity | null>(null);

  const [selectedAttemptId, setSelectedAttemptId] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [activityError, setActivityError] = useState("");

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

  const fetchUser = useCallback(async () => {
      if (!id) return;
      const t = token();
      if (!t) { setLoading(false); return; }
      setLoading(true);
      setError("");
      setActivityError("");
      try {
        const [userRes, activityRes] = await Promise.all([
          fetch(`${API_BASE}/users/${id}`, { headers: { Authorization: `Bearer ${t}` } }),
          fetch(`${API_BASE}/users/${id}/activity`, { headers: { Authorization: `Bearer ${t}` } }),
        ]);
        if (!userRes.ok) {
          throw new Error("user");
        }
        const userPayload = await userRes.json() as UserDetail;
        setUser(userPayload);
  
        if (!activityRes.ok) {
          throw new Error("activity");
        }
        const activityPayload = await activityRes.json() as UserActivity;
        setActivity(activityPayload);
        setSelectedAttemptId((current) => current || activityPayload.attempts[0]?.attempt_id || "");
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.message === "activity") {
          setActivity(null);
          setActivityError("User activity yuklab bo'lmadi.");
        } else {
          setError("Foydalanuvchini yuklab bo'lmadi.");
        }
      } finally {
        setLoading(false);
      }
    }, [id, token]);

  useEffect(() => { void fetchUser(); }, [fetchUser]);

  const doAction = async (fn: () => Promise<Response>, successMsg: string) => {
      setActionLoading(true); setActionMsg("");
      try {
        const res = await fn();
        if (!res.ok) throw new Error();
        setActionMsg(successMsg);
        void fetchUser();
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

  if (loading) return <AdminDetailLoadingSkeleton />;

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

  const selectedAttempt = activity?.attempts.find((item) => item.attempt_id === selectedAttemptId) ?? activity?.attempts[0] ?? null;

  return { id, router, user, setUser, activity, setActivity, selectedAttemptId, setSelectedAttemptId, loading, setLoading, error, setError, activityError, setActivityError, actionMsg, setActionMsg, actionLoading, setActionLoading, premiumOpen, setPremiumOpen, deleteOpen, setDeleteOpen, premiumRef, token, fetchUser, doAction, grantPremium, revokePremium, deleteUser, confirmDeleteUser, toggleLeaderboard, fullName, completionRate, memberSince, memberDays, premiumExpired, selectedAttempt };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
