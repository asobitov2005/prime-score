"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { ShieldCheck, User, Settings2, Pencil, Check, X, CreditCard, Monitor, Smartphone, Globe, Trash2, Loader2, Camera, ImageOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore } from "@/store/auth-store";
import { createApiClient } from "@/lib/api/client";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { buildUserDisplayName, splitUserDisplayName } from "@/lib/user-name";
import type { AuthSessionRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
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

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-6">
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-1 relative z-10 p-4 lg:px-5 border-b border-border/40 bg-muted/5">
          <div className="flex items-start gap-4">
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{"Account Settings"}</CardTitle>
              <CardDescription className="text-muted-foreground text-sm font-medium">
                {"Manage your profile, preferences, and active sessions."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 lg:p-5 space-y-4">
          <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> {"Profile Information"}
                </CardTitle>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">{"Telegram Connected"}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)]">
                <div className="flex items-center gap-3 md:block md:space-y-2">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-black text-primary ring-1 ring-primary/10">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={name} draggable={false} className="h-full w-full object-cover" />
                    ) : (
                      (name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-center">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleAvatarSelect(event.target.files?.[0] ?? null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-bold"
                      disabled={isSavingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {isSavingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                      {"Change"}
                    </Button>
                    {avatarUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        disabled={isSavingAvatar}
                        onClick={() => {
                          void handleRemoveAvatar();
                        }}
                      >
                        <ImageOff className="h-3.5 w-3.5" />
                        {"Remove"}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{"Full Name"}</p>
                    {!isEditing && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm font-bold"
                        autoFocus
                        disabled={isSavingProfile}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                        onClick={() => {
                          void handleSave();
                        }}
                        disabled={isSavingProfile}
                      >
                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        onClick={handleCancel}
                        disabled={isSavingProfile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-bold text-foreground">{name}</p>
                  )}
                </div>

                <div className="space-y-1 md:border-l md:border-border/40 md:pl-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{"Phone Number"}</p>
                  <p className="font-bold text-foreground">{phoneNumber || "No number attached"}</p>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" /> {"Active Sessions"}
              </CardTitle>
              {sessions.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  disabled={isSigningOutOthers}
                  onClick={() => {
                    void handleSignOutOthers();
                  }}
                >
                  {isSigningOutOthers ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {"Sign out all others"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingSessions ? (
                <div className="divide-y divide-border/40">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-muted animate-pulse" />
                        <div className="min-w-0 space-y-2">
                          <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
                          <div className="h-3 w-64 max-w-full rounded-full bg-muted animate-pulse" />
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    compact
                    icon="monitor"
                    title={"No active sessions found"}
                    description={"Your signed-in devices will appear here."}
                    className="border-dashed bg-muted/15 shadow-none"
                  />
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {sessions.map((session) => {
                    const sessionMeta = resolveSessionMeta(session);
                    
                    return (
                      <div key={session.id} className="p-3.5 flex items-center justify-between hover:bg-muted/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            sessionMeta.isMobileDevice ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary"
                          )}>
                            {sessionMeta.isMobileDevice ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-foreground">{sessionMeta.primaryLabel}</p>
                              {session.id === currentSessionId && (
                                <span className="text-[9px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">{"Current"}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              <span>{sessionMeta.deviceLabel}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><Globe className="h-3 w-3 opacity-60" /> {session.ip_address || "Unknown IP"}</span>
                              <span>•</span>
                              <span>{`Active ${formatLastUsed(session.last_used_at)}`}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          disabled={session.id === currentSessionId || revokingId === session.id} // Don't allow revoking current session
                          onClick={() => handleRevokeSession(session.id)}
                        >
                          {revokingId === session.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> {"Subscription Plan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground">{"Current Plan:"}</p>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isPremium ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {isPremium ? "Premium" : "Free Basic"}
                  </span>
                </div>
              </div>
              {!isPremium && (
                <Button asChild size="sm" className="h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-transform active:scale-95">
                  <Link href={subscriptionHref}>{"Upgrade Plan"}</Link>
                </Button>
              )}
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}
