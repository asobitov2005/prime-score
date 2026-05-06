"use client";

import Link from "next/link";
import { Suspense, useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { Headphones, LayoutDashboard, Radar, ShieldCheck, Moon, Sun, User, LogOut, ChevronDown, Settings2, Bell, PenSquare, Mic2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { createApiClient } from "@/lib/api/client";
import { buildUserDisplayName } from "@/lib/user-name";
import { useRouter, usePathname } from "next/navigation";
import { NavigationTransitionOverlay } from "@/components/layout/navigation-transition-overlay";
import { emitNavigationStart, setPendingPublicRedirect } from "@/lib/navigation-transition";

interface SiteShellProps {
  children: ReactNode;
}

const highlights = [
  { 
    title: "Telegram-only auth", 
    desc: "Quick and secure sign in with your Telegram account.",
    icon: ShieldCheck 
  },
  { 
    title: "Strict IELTS scoring", 
    desc: "Get results based on a realistic IELTS-style scoring system.",
    icon: Radar 
  },
  { 
    title: "All IELTS skills", 
    desc: "Practice Reading, Listening, Writing, and Speaking preparation online.",
    icon: LayoutDashboard 
  },
  { 
    title: "Detailed answer review", 
    desc: "Check correct answers with highlighted text after finishing the test.",
    icon: Headphones 
  }
];

export function SiteShell({ children }: SiteShellProps) {
  // This shell owns the authenticated navigation frame for the user-facing app.
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const { isAuthenticated, name, phoneNumber, sessionId, refreshToken, clearSession, syncSession, hasHydrated } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMockTestsOpen, setIsMockTestsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
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
    || currentPath.startsWith("/leaderboard")
    || currentPath.startsWith("/subscription")
    || currentPath.startsWith("/settings")
    || currentPath.startsWith("/writing")
    || currentPath.startsWith("/speaking")
    || currentPath.startsWith("/articles");
  const hideSiteChrome = currentPath.startsWith("/admin") || currentPath.startsWith("/exam-preview/");

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

  useEffect(() => {
    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      setIsHeaderCompact((current) => {
        if (current) {
          return nextScrollY > 12;
        }
        return nextScrollY > 72;
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("prime-theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.add(initialTheme);
    // Ensure the other one is removed
    document.documentElement.classList.remove(initialTheme === "light" ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("prime-theme", newTheme);
      document.documentElement.classList.add(newTheme);
      document.documentElement.classList.remove(prev);
      return newTheme;
    });
  };

  const handleSignOut = () => {
    const api = createApiClient();
    setPendingPublicRedirect("/");
    emitNavigationStart("/");
    void api.logout({ sessionId, refreshToken }).catch(() => undefined);
    clearSession();
    setIsMenuOpen(false);
    router.replace("/");
  };

  useEffect(() => {
    if (isAuthenticated && hasHydrated) {
      setNotifications([]);
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !sessionId) {
      return;
    }

    let cancelled = false;
    const api = createApiClient();

    void api.getSessionStatus(sessionId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        syncSession({
          userId: response.user.id,
          sessionId: response.session_id,
          name: buildUserDisplayName(response.user.first_name, response.user.last_name),
          phoneNumber: response.user.username ?? null,
          isPremium: Boolean(response.user.is_premium),
          premiumUntil: response.user.premium_until ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, isAuthenticated, sessionId, syncSession]);

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
  }, [currentPath]);

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
      className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary text-left flex flex-col relative"
      style={{
        "--app-shell-sticky-top": isHeaderCompact ? "5rem" : "6.5rem",
      } as CSSProperties}
    >
      <Suspense fallback={null}>
        <NavigationTransitionOverlay />
      </Suspense>

      <header className={cn(
        "sticky top-0 z-50 border-b border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background)/0.96),hsl(var(--background)/0.88))] shadow-[0_1px_0_hsl(var(--primary)/0.07),0_14px_36px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300 flex items-center shrink-0",
        isHeaderCompact ? "h-14 md:h-16" : "h-[4.5rem] md:h-24"
      )}>
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group focus-visible:outline-none rounded-xl">
            <div className={cn(
              "relative transition-all duration-300 group-hover:scale-105 flex items-center justify-center",
              isHeaderCompact ? "h-9 md:h-10" : "h-11 md:h-14"
            )}>
              <img src={theme === "light" ? "/logo-light.svg" : "/logo.svg"} alt="PrimeScore" className="relative z-10 h-full w-auto object-contain drop-shadow-sm" />
            </div>
          </Link>

          {!isAppRoute ? (
          <nav className={cn(
            "hidden items-center md:flex ml-auto mr-6 transition-all duration-300",
            isHeaderCompact ? "gap-4" : "gap-6"
          )}>
            <div 
              className={cn("relative group transition-all duration-300", isHeaderCompact ? "py-2" : "py-4")}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsMockTestsOpen(true)}
              onMouseLeave={() => {
                setTimeout(() => {
                  const isStillHovering = document.querySelector(".practice-tests-dropdown:hover");
                  const isStillHoveringParent = document.querySelector(".practice-tests-parent:hover");
                  if (!isStillHovering && !isStillHoveringParent) {
                    setIsMockTestsOpen(false);
                  }
                }, 100);
              }}
            >
              <button
                type="button"
                onClick={() => setIsMockTestsOpen((current) => !current)}
                className={cn(
                  "practice-tests-parent flex items-center gap-1 rounded-lg px-3 py-1.5 text-[14px] font-semibold transition-all hover:bg-muted/30 active:scale-95 outline-none",
                  currentPath.startsWith("/tests") ? "text-primary bg-primary/5" : "text-muted-foreground/80 hover:text-foreground"
                )}
              >
                Practice Tests <ChevronDown className={cn("h-3 w-3 opacity-70 transition-transform duration-200", isMockTestsOpen && "rotate-180")} />
              </button>

              <div className={cn(
                "practice-tests-dropdown absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[620px] rounded-2xl border border-border bg-card p-2 shadow-2xl transition-all duration-300 z-[60] grid grid-cols-2 gap-2",
                isMockTestsOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
              )}>
                <Link 
                  href="/tests?type=reading" 
                  onClick={() => setIsMockTestsOpen(false)}
                  className="flex-1 flex items-center gap-3 px-3.5 py-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all group/item"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  </div>
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-bold text-foreground">Reading</p>
                    <p className="text-[10px] font-medium text-muted-foreground/70 leading-none">Academic IELTS</p>
                  </div>
                </Link>
                <Link 
                  href="/tests?type=listening" 
                  onClick={() => setIsMockTestsOpen(false)}
                  className="flex-1 flex items-center gap-3 px-3.5 py-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all group/item"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-inner">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-bold text-foreground">Listening</p>
                    <p className="text-[10px] font-medium text-muted-foreground/70 leading-none">Academic IELTS</p>
                  </div>
                </Link>
                <Link
                  href="/ielts-writing-mock-online"
                  onClick={() => setIsMockTestsOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all group/item"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-inner">
                    <PenSquare className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-bold text-foreground">Writing</p>
                    <p className="text-[10px] font-medium text-muted-foreground/70 leading-none">Task 1 + Task 2</p>
                  </div>
                </Link>
                <Link
                  href="/ielts-speaking-mock-online"
                  onClick={() => setIsMockTestsOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all group/item"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-inner">
                    <Mic2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-bold text-foreground">Speaking</p>
                    <p className="text-[10px] font-medium text-muted-foreground/70 leading-none">Mock online</p>
                  </div>
                </Link>
              </div>
            </div>

            <NavLink href="/#features" label="Features" />
            <NavLink href="/pricing" label="Pricing" />
            <NavLink href="/#reviews" label="Reviews" />
            <NavLink href="/#about" label="About" />
          </nav>
          ) : null}

          <div className={cn("relative flex items-center gap-2 sm:gap-3", isAppRoute && "ml-auto")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden md:inline-flex h-10 w-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
              title="Toggle Light/Dark Mode"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {!isAppRoute ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileNavOpen((v) => !v);
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/40 transition-all hover:bg-muted active:scale-95 md:hidden"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileNavOpen}
              >
                <span className="sr-only">Menu</span>
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                    isMobileNavOpen ? "rotate-45 translate-y-0" : "-translate-y-[5px]"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                    isMobileNavOpen ? "opacity-0" : "translate-y-0 opacity-100"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                    isMobileNavOpen ? "-rotate-45 translate-y-0" : "translate-y-[5px]"
                  )}
                />
              </button>
            ) : null}
            
            {!mounted || !hasHydrated ? (
              <div className="hidden md:block h-11 w-24 bg-muted animate-pulse rounded-xl" />
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
                      <p className="text-sm font-bold text-foreground">Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-72">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
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
                  <div className="w-8 h-8 rounded-xl bg-primary text-black dark:text-primary-foreground flex items-center justify-center text-sm font-medium shadow-sm">
                    {name ? name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-300", isMenuOpen && "rotate-180")} />
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 w-56 rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-[60]">
                    <div className="px-3 py-3 border-b border-border/50 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Authenticated via</p>
                      <div className="flex items-center gap-2">
                        <div className="bg-[#2AABEE]/10 p-1.5 rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#2AABEE]"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </div>
                        <p className="text-sm font-bold text-foreground tracking-tight">{phoneNumber || "No number"}</p>
                      </div>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                       <Settings2 className="h-4 w-4" /> Settings
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors mt-1"
                    >
                       <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
              </div>
            ) : (
              <Button asChild size="lg" className="hidden md:inline-flex rounded-xl h-11 px-8 text-sm font-black shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:-translate-y-0.5 bg-primary text-background border-none">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {isMobileNavOpen && !isAppRoute && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            className={cn(
              "absolute left-3 right-3 rounded-2xl border border-border bg-card shadow-2xl p-3 animate-in slide-in-from-top-4 duration-200",
              isHeaderCompact ? "top-[4.5rem]" : "top-[5.5rem]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Practice</p>
              <Link
                href="/ielts-reading-mock-online"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <span className="text-sm font-semibold text-foreground">Reading</span>
              </Link>
              <Link
                href="/ielts-listening-mock-online"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Headphones className="h-[18px] w-[18px]" />
                </div>
                <span className="text-sm font-semibold text-foreground">Listening</span>
              </Link>
              <Link
                href="/ielts-writing-mock-online"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                  <PenSquare className="h-[18px] w-[18px]" />
                </div>
                <span className="text-sm font-semibold text-foreground">Writing</span>
              </Link>
              <Link
                href="/ielts-speaking-mock-online"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Mic2 className="h-[18px] w-[18px]" />
                </div>
                <span className="text-sm font-semibold text-foreground">Speaking</span>
              </Link>

              <div className="h-px bg-border/50 my-2" />

              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Explore</p>
              <Link href="/#features" onClick={() => setIsMobileNavOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                Features
              </Link>
              <Link href="/pricing" onClick={() => setIsMobileNavOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                Pricing
              </Link>
              <Link href="/ielts-mock-test-online" onClick={() => setIsMobileNavOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                IELTS Mock Online
              </Link>
              <Link href="/#reviews" onClick={() => setIsMobileNavOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                Reviews
              </Link>
              <Link href="/#about" onClick={() => setIsMobileNavOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                About
              </Link>

              <div className="h-px bg-border/50 my-2" />

              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <span>Appearance</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
              </button>

              {mounted && hasHydrated && isAuthenticated ? (
                <>
                  <Link
                    href="/settings"
                    onClick={() => setIsMobileNavOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Settings2 className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </>
              ) : mounted && hasHydrated ? (
                <Link
                  href="/login"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="mt-1 flex items-center justify-center px-3 h-11 rounded-xl bg-primary text-background text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  Login
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {currentPath === "/" && (
        <footer className="border-t border-border/40 bg-muted/30 shrink-0 pt-6 pb-8 mt-auto relative z-20">
          <div className="w-full mx-auto px-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              © 2026 PrimeScore · IELTS Mock Test Online Platform
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[14px] font-semibold transition-all hover:bg-muted/30 active:scale-95",
        active ? "text-primary bg-primary/5" : "text-muted-foreground/80 hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
