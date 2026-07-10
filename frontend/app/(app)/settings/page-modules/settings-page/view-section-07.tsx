"use client";
import type { SettingsPageScope } from "./controller";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Globe, Loader2, Monitor, Smartphone, Trash2, cn } from "../dependencies";

export function SettingsPageSection7({ scope }: { scope: SettingsPageScope }) {
  const { sessions, isSigningOutOthers, handleSignOutOthers, isLoadingSessions, resolveSessionMeta, currentSessionId, formatLastUsed, revokingId, handleRevokeSession } = scope;
  return (
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
  );
}
