"use client";

import Link from "next/link";
import { Suspense, useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { BookOpen, CalendarDays, LayoutDashboard, Moon, Sun, User, LogOut, ChevronDown, Settings2, Bell, Headphones, PenSquare, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { createApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { buildUserDisplayName } from "@/lib/user-name";
import { useRouter, usePathname } from "next/navigation";
import { NavigationTransitionOverlay } from "@/components/layout/navigation-transition-overlay";
import { emitNavigationStart, setPendingPublicRedirect } from "@/lib/navigation-transition";
import { refreshClientUserAccessToken } from "@/lib/user-auth-client";
import { listenNotificationRefresh } from "@/lib/notification-events";
import { trackCtaClick, trackLogout, trackNavigationClick, trackUiInteraction } from "@/lib/analytics";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  // This shell owns the authenticated navigation frame for the user-facing app.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { isAuthenticated, name, phoneNumber, avatarUrl, sessionId, refreshToken, clearSession, syncSession, hasHydrated, welcomeBonusDays, dismissWelcomeBonus, isPremium, premiumUntil } = useAuthStore();
  const [showWelcomeBonusModal, setShowWelcomeBonusModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMockTestsOpen, setIsMockTestsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; body: string; is_read: boolean; created_at: string }[]>([]);
  const currentPath = usePathname();
  const router = useRouter();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const isAppRoute = currentPath.startsWith("/dashboard")
    || currentPath.startsWith("/tests")
    || currentPath.startsWith("/attempts")
    || currentPath.startsWith("/history")
    || currentPath.startsWith("/bookmarks")
    || currentPath.startsWith("/leaderboard")
    || currentPath.startsWith("/achievements")
    || currentPath.startsWith("/analytics")
    || currentPath.startsWith("/subscription")
    || currentPath.startsWith("/settings")
    || currentPath.startsWith("/writing")
    || currentPath.startsWith("/speaking")
    || currentPath.startsWith("/articles");
  const hideSiteChrome = currentPath.startsWith("/admin")
    || currentPath.startsWith("/exam-preview/")
    || currentPath.startsWith("/telegram");
  const welcomeBonusVisible = hasHydrated && isAuthenticated && isAppRoute && welcomeBonusDays > 0;

  const fetchNotifications = async () => {
    const api = createApiClient();
    try {
      const items = await api.listNotifications();
      setNotifications(items);
    } catch {}
  };

  const markAllRead = async () => {
    const api = createApiClient();
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  // Fix hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("prime-theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initialTheme);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("prime-theme", newTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(newTheme);
      trackUiInteraction({
        action: "theme_toggle",
        component: "site_shell",
        value: newTheme,
      });
      return newTheme;
    });
  };

  const handleSignOut = () => {
    const api = createApiClient();
    setPendingPublicRedirect("/");
    emitNavigationStart("/");
    trackLogout({ method: "site_shell" });
    void api.logout({ sessionId, refreshToken }).catch(() => undefined);
    clearSession();
    setIsMenuOpen(false);
    router.replace("/");
  };

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    const api = createApiClient();

    const refreshNotifications = async () => {
      try {
        const items = await api.listNotifications();
        if (!cancelled) {
          setNotifications(items);
        }
      } catch {}
    };

    void refreshNotifications();
    const stopListening = listenNotificationRefresh(() => {
      void refreshNotifications();
    });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !refreshToken) {
      return;
    }

    let cancelled = false;
    void refreshClientUserAccessToken(undefined, fetch, { clearOnFailure: true })
      .then((accessToken) => {
        if (cancelled || !accessToken) {
          return;
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearSession();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, hasHydrated, isAuthenticated, refreshToken]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !sessionId) {
      return;
    }

    let cancelled = false;
    const api = createApiClient();
    const syncSessionStatus = async () => {
      try {
        const response = await api.getSessionStatus(sessionId);
        if (cancelled) {
          return;
        }
        syncSession({
          userId: response.user.id,
          sessionId: response.session_id,
          name: buildUserDisplayName(response.user.first_name, response.user.last_name),
          phoneNumber: response.user.phone ?? response.user.username ?? null,
          avatarUrl: response.user.avatar_url ?? null,
          isPremium: Boolean(response.user.is_premium),
          premiumUntil: response.user.premium_until ?? null,
          createdAt: response.user.created_at ?? null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
        }
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void syncSessionStatus();
      }
    };

    void syncSessionStatus();
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncSessionStatus();
      }
    }, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [clearSession, hasHydrated, isAuthenticated, sessionId, syncSession]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      setIsMenuOpen(false);
      setIsMockTestsOpen(false);
      const target = e.target as HTMLElement;
      if (!target.closest(".notif-panel")) setNotifOpen(false);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsMockTestsOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!welcomeBonusVisible) {
      setShowWelcomeBonusModal(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowWelcomeBonusModal(true);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [welcomeBonusVisible]);

  const closeWelcomeBonusModal = () => {
    setShowWelcomeBonusModal(false);
    dismissWelcomeBonus();
  };

  if (hideSiteChrome) {
    return (
      <>
        <Suspense fallback={null}>
          <NavigationTransitionOverlay />
        </Suspense>
        {children}
      </>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen selection:bg-blue-100 selection:text-blue-700 text-left flex flex-col relative",
        isAppRoute
          ? "bg-[#F8FAFC] dark:bg-slate-950 dark:text-slate-100"
          : "bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100"
      )}
      style={{
        "--app-shell-sticky-top": "4.5rem",
      } as CSSProperties}
    >
      <Suspense fallback={null}>
        <NavigationTransitionOverlay />
      </Suspense>

      {welcomeBonusVisible && showWelcomeBonusModal ? (
        <Dialog
          open={showWelcomeBonusModal}
          onOpenChange={() => undefined}
          title="Welcome bonus activated"
          description="Your 1-day premium is active, and a 2-day bonus is waiting for you."
          className="max-w-2xl border-amber-500/20 bg-background/95 shadow-[0_30px_90px_-20px_rgba(245,158,11,0.35)]"
          dismissible={false}
        >
          <div className="space-y-5">
            <div className="rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-background text-amber-600">
                  <PrimePremiumIcon className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-500">Premium unlocked</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                    +{welcomeBonusDays} day{welcomeBonusDays === 1 ? "" : "s"} of premium
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    Complete a Full Test in Reading or Listening to earn 2 more premium days.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Premium today</p>
                    <p className="text-xs text-muted-foreground">Your access is active now.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Next bonus</p>
                    <p className="text-xs text-muted-foreground">Finish a Full Test in Reading or Listening and get +2 days.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 flex-1 rounded-lg bg-amber-500 font-semibold text-black hover:bg-amber-400">
                <Link href="/tests?type=reading" onClick={closeWelcomeBonusModal}>
                  {"Start Reading"}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-lg"
                onClick={closeWelcomeBonusModal}
              >
                {"Continue"}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      <header 
        className={cn(
          "sticky top-0 z-50 flex h-14 shrink-0 items-center md:h-16",
          isAppRoute
            ? "border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/95 lg:ml-[16.5rem] lg:w-[calc(100%-16.5rem)]"
            : "border-b border-slate-200/60 bg-white/70 shadow-[0_8px_32px_-18px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/70"
        )}
      >
        <div
          className={cn(
            "flex w-full items-center justify-between",
            isAppRoute ? "mx-auto max-w-[77rem] px-4 sm:px-6 lg:px-6" : "mx-auto max-w-[90rem] px-2 sm:px-3 lg:px-3",
          )}
        >
          {isAppRoute ? (
            <>
              <Link href="/" className="flex h-10 min-w-0 shrink -translate-y-0.5 items-center gap-2 rounded-xl lg:hidden">
                <img src="/logo-light.svg" alt="PrimeScore" className="h-6 w-auto shrink-0 object-contain dark:hidden" />
                <img src="/logo.svg" alt="PrimeScore" className="hidden h-6 w-auto shrink-0 object-contain dark:block" />
                <span className="flex h-6 min-w-0 items-center" aria-hidden="true">
                  <img src="/exam-logo-lightmode.svg" alt="" className="h-full w-auto max-w-full object-contain dark:hidden" />
                  <img src="/exam-logo-darkmode.svg" alt="" className="hidden h-full w-auto max-w-full object-contain dark:block" />
                </span>
              </Link>
            </>
          ) : (
            <Link href="/" className="flex min-w-0 shrink -translate-y-0.5 items-center gap-2 rounded-xl group focus-visible:outline-none sm:gap-2.5">
              <div className="relative flex h-6 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105 md:h-8">
                <img src="/logo-light.svg" alt="PrimeScore" className="relative z-10 h-full w-auto object-contain drop-shadow-sm dark:hidden" />
                <img src="/logo.svg" alt="PrimeScore" className="relative z-10 hidden h-full w-auto object-contain drop-shadow-sm dark:block" />
              </div>
              <span className="flex h-6 min-w-0 items-center md:h-9" aria-hidden="true">
                <img src="/exam-logo-lightmode.svg" alt="" className="h-full w-auto max-w-full object-contain dark:hidden" />
                <img src="/exam-logo-darkmode.svg" alt="" className="hidden h-full w-auto max-w-full object-contain dark:block" />
              </span>
            </Link>
          )}

          {!isAppRoute ? (
          <nav className="ml-auto mr-4 hidden items-center gap-1 md:flex">
            <PracticeTestsMenu
              isOpen={isMockTestsOpen}
              currentPath={currentPath}
              isAuthenticated={isAuthenticated}
              onOpenChange={setIsMockTestsOpen}
              variant="marketing"
            />
            <NavLink href="/#features" label={"Features"} variant="marketing" />
            <NavLink href="/#pricing" label={"Pricing"} variant="marketing" />
            <NavLink href="/#reviews" label={"Reviews"} variant="marketing" />
            <NavLink href="/#about" label={"About"} variant="marketing" />
          </nav>
          ) : null}

          <div className={cn("relative flex shrink-0 items-center gap-2 sm:gap-3", isAppRoute && "ml-auto")}>
            {!isAppRoute ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden h-10 w-10 rounded-xl text-slate-500 transition-all hover:bg-orange-50 hover:text-orange-500 active:scale-95 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 md:inline-flex"
              title={"Toggle Light/Dark Mode"}
              aria-label={"Toggle Light/Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            ) : null}

            {!isAppRoute ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileNavOpen((v) => !v);
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-950 shadow-sm backdrop-blur transition-all hover:border-orange-200 hover:bg-orange-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-orange-500/10 md:hidden"
                aria-label={"Menu"}
                aria-expanded={isMobileNavOpen}
              >
                <span className="sr-only">{"Menu"}</span>
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                    !isAppRoute && "bg-slate-950 dark:bg-slate-100",
                    isMobileNavOpen ? "rotate-45 translate-y-0" : "-translate-y-[5px]"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                    !isAppRoute && "bg-slate-950 dark:bg-slate-100",
                    isMobileNavOpen ? "opacity-0" : "translate-y-0 opacity-100"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                    !isAppRoute && "bg-slate-950 dark:bg-slate-100",
                    isMobileNavOpen ? "-rotate-45 translate-y-0" : "translate-y-[5px]"
                  )}
                />
              </button>
            ) : null}
            
            {isAppRoute && isAuthenticated && isPremium ? (
              <span className="hidden h-10 cursor-default select-none items-center gap-2 rounded-full border border-amber-200 bg-[#FEF3C7] px-4 text-sm font-semibold text-amber-800 shadow-none dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 md:inline-flex">
                <PrimePremiumIcon className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                {"Premium"}
              </span>
            ) : null}


            {isAppRoute ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hidden h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-500 shadow-none transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 md:inline-flex"
                title={"Toggle Light/Dark Mode"}
                aria-label={"Toggle Light/Dark Mode"}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            ) : null}

            {!mounted || !hasHydrated ? (
              isAppRoute ? (
                <div className="hidden md:block h-11 w-24 bg-muted animate-pulse rounded-xl" />
              ) : (
                <Button asChild size="lg" className="hidden md:inline-flex h-11 rounded-full border-none bg-orange-500 px-8 text-sm font-semibold text-white shadow-[0_20px_40px_-18px_rgba(249,115,22,0.85)] transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl">
                  <Link
                    href="/login"
                    onClick={() => {
                      trackCtaClick({
                        ctaName: "header_login",
                        ctaLabel: "Login",
                        ctaLocation: "desktop_header",
                        destination: "/login",
                        authState: "guest",
                      });
                    }}
                  >
                    {"Login"}
                  </Link>
                </Button>
              )
            ) : isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative notif-panel" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
                  className="relative h-10 w-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95 flex items-center justify-center"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">{unreadCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute top-full right-0 mt-3 w-80 max-h-96 rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-[60] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">{"Notifications"}</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
                          {"Mark all read"}
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto overscroll-contain">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{"No notifications yet"}</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={cn("px-4 py-3 border-b border-border/30 transition-colors", !n.is_read && "bg-primary/5")}>
                            <div className="flex items-start gap-3">
                              <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", n.is_read ? "bg-transparent" : "bg-primary")} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                  {(() => { const d = new Date(n.created_at); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-3 rounded-2xl border border-border bg-muted/40 hover:bg-muted transition-all active:scale-95 group outline-none"
                >
                  <span className="text-xs font-bold text-foreground opacity-80 group-hover:opacity-100">{name}</span>
                  <div className="w-8 h-8 overflow-hidden rounded-xl bg-primary text-black dark:text-primary-foreground flex items-center justify-center text-sm font-medium shadow-sm">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={name} draggable={false} className="h-full w-full object-cover" />
                    ) : name ? (
                      name.charAt(0).toUpperCase()
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-300", isMenuOpen && "rotate-180")} />
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 w-56 rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-[60]">
                    <div className="px-3 py-3 border-b border-border/50 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{"Authenticated via"}</p>
                      <div className="flex items-center gap-2">
                        <div className="bg-[#2AABEE]/10 p-1.5 rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#2AABEE]"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </div>
                        <p className="text-sm font-bold text-foreground tracking-tight">{phoneNumber || "No number"}</p>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                       <LayoutDashboard className="h-4 w-4" /> {"Dashboard"}
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                       <Settings2 className="h-4 w-4" /> {"Settings"}
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors mt-1"
                    >
                       <LogOut className="h-4 w-4" /> {"Sign Out"}
                    </button>
                  </div>
                )}
              </div>
              </div>
            ) : (
              <Button asChild size="lg" className={cn("hidden md:inline-flex h-11 rounded-full px-8 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl border-none", isAppRoute ? "bg-primary text-background shadow-lg shadow-primary/20" : "bg-orange-500 text-white shadow-[0_20px_40px_-18px_rgba(249,115,22,0.85)] hover:bg-orange-600")}>
                <Link
                  href="/login"
                  onClick={() => {
                    trackCtaClick({
                      ctaName: "header_login",
                      ctaLabel: "Login",
                      ctaLocation: "desktop_header",
                      destination: "/login",
                      authState: "guest",
                    });
                  }}
                >
                  {"Login"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {isMobileNavOpen && !isAppRoute && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-200 md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            className="absolute left-3 right-3 top-[4.25rem] rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl animate-in slide-in-from-top-4 duration-200 dark:border-slate-800 dark:bg-slate-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <p className="px-3 pt-1 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">{"Practice"}</p>
              <MobilePracticeLink
                href="/tests?type=reading"
                label="Reading"
                description={"Academic IELTS"}
                icon={<BookOpen className="h-[18px] w-[18px]" />}
                isAuthenticated={isAuthenticated}
                onClose={() => setIsMobileNavOpen(false)}
              />
              <MobilePracticeLink
                href="/tests?type=listening"
                label="Listening"
                description={"Academic IELTS"}
                icon={<Headphones className="h-[18px] w-[18px]" />}
                isAuthenticated={isAuthenticated}
                onClose={() => setIsMobileNavOpen(false)}
              />
              <MobilePracticeLink
                href="/writing"
                label="Writing"
                description={"Task 1 + Task 2"}
                icon={<PenSquare className="h-[18px] w-[18px]" />}
                isAuthenticated={isAuthenticated}
                onClose={() => setIsMobileNavOpen(false)}
              />
              <MobilePracticeLink
                href="/ielts-speaking-mock-online"
                label="Speaking"
                description={"Mock online"}
                icon={<Mic2 className="h-[18px] w-[18px]" />}
                isAuthenticated={isAuthenticated}
                onClose={() => setIsMobileNavOpen(false)}
              />

              <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />

              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Explore"}</p>
              <MobileNavLink href="/#features" label={"Features"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />
              <MobileNavLink href="/#pricing" label={"Pricing"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />
              <MobileNavLink href="/#reviews" label={"Reviews"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />
              <MobileNavLink href="/#about" label={"About"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />

              <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />


              {mounted && hasHydrated && isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileNavOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-orange-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-slate-50"
                  >
                    <LayoutDashboard className="h-4 w-4" /> {"Dashboard"}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsMobileNavOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-orange-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-slate-50"
                  >
                    <Settings2 className="h-4 w-4" /> {"Settings"}
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" /> {"Sign Out"}
                  </button>
                </>
              ) : mounted && hasHydrated ? (
                <Link
                  href="/login"
                  onClick={() => {
                    trackCtaClick({
                      ctaName: "mobile_login",
                      ctaLabel: "Login",
                      ctaLocation: "mobile_nav",
                      destination: "/login",
                      authState: "guest",
                    });
                    setIsMobileNavOpen(false);
                  }}
                  className="mt-1 flex h-11 items-center justify-center rounded-full bg-orange-500 px-3 text-sm font-semibold text-white shadow-[0_20px_40px_-18px_rgba(249,115,22,0.85)] transition-all active:scale-[0.98]"
                >
                  {"Login"}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  variant,
}: {
  href: string;
  label: string;
  active?: boolean;
  variant?: "marketing";
}) {
  const isMarketing = variant === "marketing";

  return (
    <Link
      href={href}
      onClick={() => {
        trackNavigationClick({
          label,
          href,
          location: "header_nav",
        });
      }}
      className={cn(
        "text-[13px] font-semibold transition-all active:scale-95",
        isMarketing
          ? "rounded-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70"
          : "rounded-lg px-3 py-1.5 hover:bg-orange-50 dark:hover:bg-orange-500/10",
        active
          ? isMarketing
            ? "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
            : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
          : isMarketing
            ? "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
            : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50",
      )}
    >
      {label}
    </Link>
  );
}

function PracticeTestsMenu({
  isOpen,
  currentPath,
  isAuthenticated,
  onOpenChange,
  variant,
}: {
  isOpen: boolean;
  currentPath: string;
  isAuthenticated: boolean;
  onOpenChange: (value: boolean) => void;
  variant?: "marketing";
}) {
  const isMarketing = variant === "marketing";
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = currentPath.startsWith("/tests")
    || currentPath.startsWith("/writing")
    || currentPath.startsWith("/speaking")
    || currentPath.startsWith("/ielts-");

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    onOpenChange(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      onOpenChange(false);
      closeTimerRef.current = null;
    }, 180);
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  return (
    <div
      className="relative py-3"
      onClick={(event) => event.stopPropagation()}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
    >
      <button
        type="button"
        onClick={() => {
          clearCloseTimer();
          onOpenChange(!isOpen);
        }}
        className={cn(
          "flex items-center gap-1 text-[13px] font-semibold transition-all active:scale-95",
          isMarketing
            ? "rounded-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            : "rounded-lg px-3 py-1.5 hover:bg-orange-50 dark:hover:bg-orange-500/10",
          isActive
            ? isMarketing
              ? "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
              : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
            : isMarketing
              ? "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50",
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {"Practice Tests"}
        <ChevronDown className={cn("h-3 w-3 opacity-70 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Hover bridge: spans from the trigger's bottom edge down to the menu so
          cursor movement never crosses a non-hoverable dead zone. Hover handlers
          live only on the outer wrapper; since this menu is a DOM descendant,
          moving between the trigger and the menu never fires the wrapper's
          mouseleave, so the menu stays open. */}
      <div
        className={cn(
          "absolute left-1/2 top-full z-[60] w-[620px] -translate-x-1/2 -translate-y-3 pt-3",
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.48)] transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_24px_60px_-34px_rgba(0,0,0,0.85)]",
            isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          )}
          role="menu"
        >
          <PracticeDropdownLink
            href="/tests?type=reading"
            label="Reading"
            description={"Academic IELTS"}
            icon={<BookOpen className="h-4 w-4" />}
            accentClassName="bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-300"
            isAuthenticated={isAuthenticated}
            onClose={() => onOpenChange(false)}
          />
          <PracticeDropdownLink
            href="/tests?type=listening"
            label="Listening"
            description={"Academic IELTS"}
            icon={<Headphones className="h-4 w-4" />}
            accentClassName="bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/10 dark:text-emerald-300"
            isAuthenticated={isAuthenticated}
            onClose={() => onOpenChange(false)}
          />
          <PracticeDropdownLink
            href="/writing"
            label="Writing"
            description={"Task 1 + Task 2"}
            icon={<PenSquare className="h-4 w-4" />}
            accentClassName="bg-violet-500/10 text-violet-500 dark:bg-violet-400/10 dark:text-violet-300"
            isAuthenticated={isAuthenticated}
            onClose={() => onOpenChange(false)}
          />
          <PracticeDropdownLink
            href="/ielts-speaking-mock-online"
            label="Speaking"
            description={"Mock online"}
            icon={<Mic2 className="h-4 w-4" />}
            accentClassName="bg-orange-500/10 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300"
            isAuthenticated={isAuthenticated}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </div>
    </div>
  );
}

function PracticeDropdownLink({
  href,
  label,
  description,
  icon,
  accentClassName,
  isAuthenticated,
  onClose,
}: {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  accentClassName: string;
  isAuthenticated: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        trackNavigationClick({
          label,
          href,
          location: "practice_tests_dropdown",
          authState: isAuthenticated ? "authenticated" : "guest",
        });
        onClose();
      }}
      className="group/item flex items-center gap-3 rounded-xl border border-slate-200/75 bg-white px-3.5 py-3 transition-all hover:border-orange-200 hover:bg-orange-50/55 dark:border-slate-800 dark:bg-slate-950/35 dark:hover:border-orange-500/30 dark:hover:bg-orange-500/10"
      role="menuitem"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-inner transition-transform group-hover/item:scale-105", accentClassName)}>
        {icon}
      </div>
      <div className="space-y-0.5 text-left">
        <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{label}</p>
        <p className="text-[10px] font-medium leading-none text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

function MobilePracticeLink({
  href,
  label,
  description,
  icon,
  isAuthenticated,
  onClose,
}: {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  isAuthenticated: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        trackNavigationClick({
          label,
          href,
          location: "mobile_nav",
          authState: isAuthenticated ? "authenticated" : "guest",
        });
        onClose();
      }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs font-medium leading-4 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  isAuthenticated,
  onClose,
}: {
  href: string;
  label: string;
  isAuthenticated: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        trackNavigationClick({
          label,
          href,
          location: "mobile_nav",
          authState: isAuthenticated ? "authenticated" : "guest",
        });
        onClose();
      }}
      className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-orange-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-slate-50"
    >
      {label}
    </Link>
  );
}
