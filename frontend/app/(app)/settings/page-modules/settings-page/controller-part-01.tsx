"use client";
import type { BaseScope } from "./base";
import { AuthSessionRead, buildUserDisplayName, createApiClient, getSubscriptionPageHref, splitUserDisplayName, useAuthStore, useCallback, useEffect, useMemo, useRef, useState } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
  const { name, phoneNumber, avatarUrl, updateName, updateAvatar, syncSession, isPremium, sessionId: currentSessionId, isAuthenticated, hasHydrated } = useAuthStore();

  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);

  const [isEditing, setIsEditing] = useState(false);

  const [editName, setEditName] = useState(name);

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [sessions, setSessions] = useState<AuthSessionRead[]>([]);

  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);

  const api = useMemo(() => createApiClient(), []);

  const fetchSessions = useCallback(async () => {
      if (!hasHydrated || !isAuthenticated) {
        setSessions([]);
        setIsLoadingSessions(false);
        return;
      }
  
      setIsLoadingSessions(true);
      try {
        const response = await api.listSessions();
        setSessions(response.items);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setIsLoadingSessions(false);
      }
    }, [api, hasHydrated, isAuthenticated]);

  useEffect(() => {
      fetchSessions();
    }, [fetchSessions]);

  useEffect(() => {
      if (!hasHydrated || !isAuthenticated) {
        return;
      }
  
      let cancelled = false;
      void api.getMe()
        .then((profile) => {
          if (cancelled) {
            return;
          }
          syncSession({
            userId: profile.id,
            name: buildUserDisplayName(profile.first_name, profile.last_name, name),
            phoneNumber: profile.phone ?? profile.username ?? null,
            avatarUrl: profile.avatar_url ?? null,
            isPremium: Boolean(profile.is_premium),
            premiumUntil: profile.premium_until ?? null,
            createdAt: profile.created_at ?? null,
          });
        })
        .catch((error) => {
          console.error("Failed to fetch profile:", error);
        });
  
      return () => {
        cancelled = true;
      };
    }, [api, hasHydrated, isAuthenticated, name, syncSession]);

  useEffect(() => {
      setEditName(name);
    }, [name]);

  const handleRevokeSession = async (sessionId: string) => {
      setRevokingId(sessionId);
      try {
        await api.revokeSession(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } catch (error) {
        console.error("Failed to revoke session:", error);
      } finally {
        setRevokingId(null);
      }
    };

  const handleSignOutOthers = async () => {
      const otherSessions = sessions.filter((session) => session.id !== currentSessionId);
      if (otherSessions.length === 0) {
        return;
      }
  
      setIsSigningOutOthers(true);
      try {
        await Promise.allSettled(otherSessions.map((session) => api.revokeSession(session.id)));
        setSessions((prev) => prev.filter((session) => session.id === currentSessionId));
      } catch (error) {
        console.error("Failed to revoke other sessions:", error);
      } finally {
        setIsSigningOutOthers(false);
      }
    };

  const handleSave = async () => {
      const trimmedName = editName.trim();
      if (!trimmedName) {
        return;
      }
  
      const { firstName, lastName } = splitUserDisplayName(trimmedName);
      if (!firstName) {
        return;
      }
  
      setIsSavingProfile(true);
      try {
        const profile = await api.updateMe({
          first_name: firstName,
          last_name: lastName,
        });
        updateName(buildUserDisplayName(profile.first_name, profile.last_name, trimmedName));
        setIsEditing(false);
      } catch (error) {
        console.error("Failed to save profile:", error);
      } finally {
        setIsSavingProfile(false);
      }
    };

  const handleAvatarSelect = async (file: File | null) => {
      if (!file) {
        return;
      }
  
      setIsSavingAvatar(true);
      try {
        const profile = await api.uploadMyAvatar(file);
        updateAvatar(profile.avatar_url ?? null);
        updateName(buildUserDisplayName(profile.first_name, profile.last_name, name));
      } catch (error) {
        console.error("Failed to upload avatar:", error);
      } finally {
        setIsSavingAvatar(false);
        if (avatarInputRef.current) {
          avatarInputRef.current.value = "";
        }
      }
    };

  const handleRemoveAvatar = async () => {
      setIsSavingAvatar(true);
      try {
        const profile = await api.deleteMyAvatar();
        updateAvatar(profile.avatar_url ?? null);
      } catch (error) {
        console.error("Failed to remove avatar:", error);
      } finally {
        setIsSavingAvatar(false);
      }
    };

  const handleCancel = () => {
      setEditName(name);
      setIsEditing(false);
    };

  const formatLastUsed = (dateStr?: string) => {
      if (!dateStr) return "Never";
      const date = new Date(dateStr);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
  
      if (diffInMins < 1) return "Just now";
      if (diffInMins < 60) return `${diffInMins}m ago`;
      if (diffInMins < 1440) return `${Math.floor(diffInMins / 60)}h ago`;
      return date.toLocaleDateString();
    };

  const resolveSessionMeta = (session: AuthSessionRead) => {
      const rawUserAgent = String(session.device_info?.user_agent ?? session.device_info?.browser ?? "").trim();
      const lowerUserAgent = rawUserAgent.toLowerCase();
      const sessionBrowser = String(session.device_info?.browser ?? "").trim();
      const sessionOs = String(session.device_info?.os ?? "").trim();
      const sessionType = String(session.device_info?.type ?? "").trim();
  
      const browser = sessionBrowser
        || (lowerUserAgent.includes("edg/") ? "Edge" :
          lowerUserAgent.includes("opr/") || lowerUserAgent.includes("opera") ? "Opera" :
          lowerUserAgent.includes("firefox/") || lowerUserAgent.includes("fxios/") ? "Firefox" :
          (lowerUserAgent.includes("chrome/") || lowerUserAgent.includes("crios/")) && !lowerUserAgent.includes("edg/") && !lowerUserAgent.includes("opr/") ? "Chrome" :
          lowerUserAgent.includes("safari/") && !lowerUserAgent.includes("chrome/") && !lowerUserAgent.includes("crios/") ? "Safari" :
          "Browser");
  
      const isTabletDevice = sessionType === "Tablet" || lowerUserAgent.includes("ipad") || lowerUserAgent.includes("tablet");
      const isMobileDevice = !isTabletDevice && (
        sessionType === "Mobile"
        || lowerUserAgent.includes("android")
        || lowerUserAgent.includes("iphone")
        || lowerUserAgent.includes("mobile")
      );
      const platformLabel = sessionOs || (isMobileDevice ? "Mobile OS" : "Desktop OS");
  
      return {
        isMobileDevice,
        primaryLabel: browser,
        deviceLabel: isTabletDevice
          ? `${platformLabel} tablet`
          : isMobileDevice
            ? `${platformLabel} phone`
            : platformLabel,
      };
    };

  return { name, phoneNumber, avatarUrl, updateName, updateAvatar, syncSession, isPremium, currentSessionId, isAuthenticated, hasHydrated, subscriptionHref, isEditing, setIsEditing, editName, setEditName, isSavingProfile, setIsSavingProfile, isSavingAvatar, setIsSavingAvatar, avatarInputRef, sessions, setSessions, isLoadingSessions, setIsLoadingSessions, revokingId, setRevokingId, isSigningOutOthers, setIsSigningOutOthers, api, fetchSessions, handleRevokeSession, handleSignOutOthers, handleSave, handleAvatarSelect, handleRemoveAvatar, handleCancel, formatLastUsed, resolveSessionMeta };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
