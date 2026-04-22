"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShieldCheck, User, Settings2, Pencil, Check, X, CreditCard, Monitor, Smartphone, Globe, Trash2, Loader2, Crown, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { createApiClient } from "@/lib/api/client";
import type { AuthSessionRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { name, phoneNumber, updateName, isPremium, sessionId: currentSessionId } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  
  const [sessions, setSessions] = useState<AuthSessionRead[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const api = createApiClient();

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const response = await api.listSessions();
      setSessions(response.items);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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

  const handleSave = () => {
    if (editName.trim()) {
      updateName(editName.trim());
      setIsEditing(false);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
          <div className="flex items-start gap-4">
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Account Settings</CardTitle>
              <CardDescription className="text-muted-foreground text-sm font-medium">
                Manage your profile, preferences, and active sessions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 lg:p-6 space-y-6">
          {isPremium && (
            <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
              <CardContent className="relative z-10 p-5 lg:p-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                    <Crown className="h-3.5 w-3.5" />
                    Premium Active
                    <Sparkles className="h-3 w-3 opacity-80" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tracking-tight text-foreground">Your premium access is live.</p>
                    <p className="mt-1 max-w-2xl text-sm font-medium text-muted-foreground">
                      You already have the strongest PrimeScore access level with premium tests, explanation-led review, and a cleaner exam-prep workflow.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Info */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="p-4 border-b border-border/40 bg-muted/5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</p>
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
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600" onClick={handleSave}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-bold text-foreground">{name}</p>
                  )}
                </div>
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone Number</p>
                  <p className="font-bold text-foreground">{phoneNumber || "No number attached"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="p-4 border-b border-border/40 bg-muted/5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Security & Auth
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground">Telegram Connected</p>
                    <p className="text-[11px] text-muted-foreground">Your account is secured by Telegram.</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Sessions */}
          <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" /> Active Sessions
              </CardTitle>
              {sessions.length > 1 && (
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                   // In a real app, you'd call an endpoint to logout all other sessions
                   alert("Logging out other sessions...");
                }}>
                  Sign out all others
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingSessions ? (
                <div className="p-8 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading active sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No active sessions found.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {sessions.map((session) => {
                    const isMobile = session.device_info?.type === "Mobile";
                    const browser = session.device_info?.browser?.split(" ")[0] || "Web Browser";
                    
                    return (
                      <div key={session.id} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            isMobile ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary"
                          )}>
                            {isMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-foreground">{isMobile ? "Mobile App" : browser}</p>
                              {session.id === currentSessionId && (
                                <span className="text-[9px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">Current</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1"><Globe className="h-3 w-3 opacity-60" /> {session.ip_address || "Unknown IP"}</span>
                              <span>•</span>
                              <span>Active {formatLastUsed(session.last_used_at)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
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

          {/* Subscription Plan */}
          <Card className="border-border/60 bg-card/40 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Subscription Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground">Current Plan:</p>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isPremium ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {isPremium ? "Premium" : "Free Basic"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  {isPremium ? "You have full access to premium tests, exclusive explanations, and the full PrimeScore prep flow." : "Upgrade to Premium to unlock all full IELTS mock tests and advanced analytics."}
                </p>
              </div>
              {!isPremium && (
                <Button asChild size="sm" className="h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-transform active:scale-95">
                  <Link href="/subscription">Upgrade Plan</Link>
                </Button>
              )}
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}
