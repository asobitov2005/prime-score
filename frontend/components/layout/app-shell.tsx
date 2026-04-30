"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookMarked, BookOpenText, ChevronDown, CreditCard, FileStack, Gauge, History, Medal, Menu, Newspaper, PenSquare, PencilRuler, Podcast, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";
import { consumePendingPublicRedirect } from "@/lib/navigation-transition";

interface AppShellProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/tests", label: "Tests", icon: BookOpenText },
  { href: "/writing", label: "Writing", icon: PenSquare },
  { href: "/speaking", label: "Speaking", icon: Podcast, soon: true },
  { href: "/articles", label: "Articles", icon: Newspaper, soon: true },
  { href: "/history", label: "History", icon: History },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings2 }
] as const;

const testSourceItems = [
  { href: "/tests?source=cambridge", label: "Cambridge Official", id: "cambridge", icon: BookMarked },
  { href: "/tests?source=real_exam", label: "Recent Exam Papers", id: "real_exam", icon: FileStack },
  { href: "/tests?source=custom", label: "Exam Practice Tests", id: "custom", icon: PencilRuler },
] as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sidebar, toggleSidebar } = useUIStore();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTestsSubmenuOpen, setIsTestsSubmenuOpen] = useState(false);
  const isPublicTestsRoute = pathname === "/tests" || pathname.startsWith("/tests/");
  const activeSource = searchParams.get("source") ?? "";

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (!isAuthenticated && !isPublicTestsRoute) {
      router.replace(consumePendingPublicRedirect() ?? "/login");
    }
  }, [hasHydrated, isAuthenticated, isPublicTestsRoute, router]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/tests")) {
      setIsTestsSubmenuOpen(Boolean(activeSource));
      return;
    }
    setIsTestsSubmenuOpen(false);
  }, [pathname, activeSource]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);

  if (!hasHydrated && !isPublicTestsRoute) {
    return (
      <AppLoadingPlaceholder
        title="Restoring your workspace"
        description="Checking your PrimeScore session before the app layout opens."
      />
    );
  }

  if (hasHydrated && !isAuthenticated && !isPublicTestsRoute) {
    return (
      <AppLoadingPlaceholder
        title="Redirecting to sign in"
        description="Your session is not active, so PrimeScore is taking you to the login screen."
      />
    );
  }

  const SidebarContent = () => (
    <>
      <Card className="p-3 border-border/50 shadow-sm bg-card/60 backdrop-blur-md rounded-xl">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 pl-2">Main Menu</p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            const isSoonItem = "soon" in item && item.soon;

            return (
              <div key={item.href} className="space-y-1">
                <div className="relative">
                  {isSoonItem ? (
                    <div
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 pr-11 text-sm font-semibold text-muted-foreground/65"
                    >
                      <Icon className="h-4 w-4 opacity-60" />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span>{item.label}</span>
                        <span className="rounded-full border border-border/50 bg-muted/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
                          Soon
                        </span>
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 pr-11 text-sm font-semibold transition-all duration-200",
                        active
                          ? "bg-primary text-background shadow-sm"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-95"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          active ? "opacity-100" : "opacity-70"
                        )}
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span>{item.label}</span>
                      </span>
                    </Link>
                  )}

                  {item.href === "/tests" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setIsTestsSubmenuOpen((current) => !current);
                      }}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                        active
                          ? "text-background hover:bg-background/15"
                          : "text-foreground/80 hover:bg-muted/70 hover:text-foreground"
                      )}
                      aria-label="Toggle test sources"
                      aria-expanded={isTestsSubmenuOpen}
                    >
                      <ChevronDown className={cn("h-[18px] w-[18px] stroke-[2.4] transition-transform", isTestsSubmenuOpen && "rotate-180")} />
                    </button>
                  )}
                </div>

                {item.href === "/tests" && (
                  <div
                    className={cn(
                      "grid pl-5 transition-all duration-300 ease-out",
                      isTestsSubmenuOpen ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="relative space-y-1 overflow-hidden pl-3 before:absolute before:bottom-1 before:left-0 before:top-1 before:w-px before:rounded-full before:bg-slate-300 dark:before:bg-slate-600">
                      {testSourceItems.map((sourceItem) => {
                        const isSourceActive = active && activeSource === sourceItem.id;
                        const SourceIcon = sourceItem.icon;

                        return (
                          <Link
                            key={sourceItem.id}
                            href={sourceItem.href}
                            className={cn(
                              "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition-all before:absolute before:-left-3 before:top-1/2 before:h-px before:w-2 before:-translate-y-1/2 before:rounded-full before:bg-slate-300 dark:before:bg-slate-600",
                              isSourceActive
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground/85 hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                isSourceActive ? "bg-muted-foreground/15" : "bg-muted/80"
                              )}
                            >
                              <SourceIcon className="h-3.5 w-3.5" />
                            </span>
                            <span>{sourceItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </Card>

    </>
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 flex flex-col lg:flex-row gap-6 md:gap-8 items-start relative">
      {/* Mobile Sidebar Toggle Button - Floating because header is global */}
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => setIsMobileOpen(true)} 
        className="lg:hidden fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-primary text-background shadow-xl border-none hover:bg-primary/90 active:scale-95"
        aria-label="Open Menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border/50 shadow-2xl p-5 flex flex-col gap-5 lg:hidden transition-transform duration-300 ease-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <p className="font-bold text-base text-foreground">Menu</p>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="h-8 w-8 rounded-full hover:bg-muted/50 -mr-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pb-6 no-scrollbar">
           <SidebarContent />
        </div>
      </div>

      <aside className={cn(
        "hidden lg:block w-64 shrink-0 transition-all duration-300 sticky top-[var(--app-shell-sticky-top,7.5rem)]", 
        sidebar === "collapsed" ? "lg:hidden" : "lg:block"
      )}>
        <div className="space-y-4">
          <SidebarContent />
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full animate-in fade-in duration-500 ease-out">
        {children}
      </main>
    </div>
  );
}
