"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, BookMarked, BookOpenText, CreditCard, Gauge, History, Mic, PenTool, Trophy, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { useBookmarksStore } from "@/store/bookmarks-store";
import { useRouter } from "next/navigation";
import { AppLoadingPlaceholder, AppRouteLoadingFrame, ExamRouteLoadingFrame } from "@/components/layout/app-loading-placeholder";
import { trackNavigationClick } from "@/lib/analytics";
import { consumePendingPublicRedirect, emitNavigationStart, PRIME_NAVIGATION_START_EVENT } from "@/lib/navigation-transition";
import { SidebarPremiumCard } from "@/components/layout/sidebar-premium-card";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebar } = useUIStore();
  const isMobileOpen = useUIStore((state) => state.isMobileSidebarOpen);
  const setIsMobileOpen = useUIStore((state) => state.setMobileSidebarOpen);
  const { isAuthenticated, hasHydrated, isPremium, userId } = useAuthStore();
  const ensureBookmarksHydrated = useBookmarksStore((state) => state.ensureHydrated);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const [showAnalyticsPremiumModal, setShowAnalyticsPremiumModal] = useState(false);
  const isPublicTestsRoute = pathname === "/tests" || pathname.startsWith("/tests/");
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);
  const pendingNavigationPathname = pendingNavigationHref
    ? new URL(pendingNavigationHref, "https://primescore.local").pathname
    : null;
  const isPendingExamPreview = Boolean(pendingNavigationPathname?.startsWith("/exam-preview/"));

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/tests", label: "Practice Tests", icon: BookOpenText },
    { href: "/writing", label: "Writing", icon: PenTool },
    { href: "/speaking", label: "Speaking", icon: Mic, activePath: "/speaking" },
    { href: "/history", label: "History", icon: History },
    { href: "/bookmarks", label: "Bookmarks", icon: BookMarked },
    { href: "/analytics", label: "Analytics", icon: BarChart3, badge: "Premium" },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/subscription", label: "Subscription", icon: CreditCard },
    { href: "/settings", label: "Settings", icon: Settings2 },
  ] as const;

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
  }, [pathname, setIsMobileOpen]);

  useEffect(() => {
    setPendingNavigationHref(null);
  }, [pathname]);

  useEffect(() => {
    const handleNavigationStart = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail?.href !== "string") {
        return;
      }

      const targetUrl = new URL(event.detail.href, window.location.href);
      const targetHref = `${targetUrl.pathname}${targetUrl.search}`;
      const currentHref = `${window.location.pathname}${window.location.search}`;
      if (targetUrl.origin !== window.location.origin || targetHref === currentHref) {
        return;
      }

      setPendingNavigationHref(targetHref);
    };

    window.addEventListener(PRIME_NAVIGATION_START_EVENT, handleNavigationStart);
    return () => window.removeEventListener(PRIME_NAVIGATION_START_EVENT, handleNavigationStart);
  }, []);

  useEffect(() => {
    if (!pendingNavigationHref) {
      return;
    }

    const timeout = window.setTimeout(() => setPendingNavigationHref(null), 10_000);
    return () => window.clearTimeout(timeout);
  }, [pendingNavigationHref]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    void ensureBookmarksHydrated(isAuthenticated ? userId : null);
  }, [hasHydrated, isAuthenticated, userId, ensureBookmarksHydrated]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);

  if (!hasHydrated && !isPublicTestsRoute) {
    return <AppRouteLoadingFrame sidebar={sidebar} />;
  }

  if (hasHydrated && !isAuthenticated && !isPublicTestsRoute) {
    return <AppRouteLoadingFrame sidebar={sidebar} />;
  }

  const SidebarBrand = () => (
    <Link href="/" className="flex h-16 -translate-y-0.5 items-center gap-2 rounded-xl px-1">
      <span className="relative flex h-7 items-center">
        <img src="/logo-light.svg" alt="PrimeScore" className="h-7 w-auto object-contain dark:hidden" />
        <img src="/logo.svg" alt="PrimeScore" className="hidden h-7 w-auto object-contain dark:block" />
      </span>
      <span className="flex h-8 items-center" aria-hidden="true">
        <img src="/exam-logo-lightmode.svg" alt="" className="h-full w-auto object-contain dark:hidden" />
        <img src="/exam-logo-darkmode.svg" alt="" className="hidden h-full w-auto object-contain dark:block" />
      </span>
    </Link>
  );

  const SidebarNavigation = () => (
    <div className="bg-background">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isExternal = "external" in item && item.external;
          const disabled = Boolean(!isExternal && "disabled" in item && item.disabled);
          const requiresPremium = !isExternal && item.href === "/analytics";
          const activePath = !isExternal && "activePath" in item ? item.activePath : item.href;
          const activeSourcePath = pendingNavigationPathname ?? pathname;
          const active = !isExternal && !disabled && (
            activeSourcePath === activePath
            || activeSourcePath.startsWith(`${activePath}/`)
          );
          const Icon = item.icon;
          const itemClassName = cn(
            "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            disabled
              ? "cursor-not-allowed text-muted-foreground/50 opacity-55 grayscale"
              : active
              ? "bg-accent text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          );
          const iconClassName = cn(
            "h-4 w-4",
            disabled ? "text-muted-foreground/50" : active ? "text-primary" : "text-muted-foreground"
          );
          const content = (
            <>
              <Icon className={iconClassName} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {"badge" in item ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full border border-primary/20 bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-primary",
                    disabled && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </>
          );

          if (isExternal) {
            return (
              <a
                key={`${item.label}-${item.href}`}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackNavigationClick({
                    label: item.label,
                    href: item.href,
                    location: "app_sidebar",
                    authState: isAuthenticated ? "authenticated" : "guest",
                  });
                }}
                className={itemClassName}
              >
                {content}
              </a>
            );
          }

          if (disabled) {
            return (
              <span
                key={`${item.label}-${item.href}`}
                aria-disabled="true"
                title="Unavailable"
                className={itemClassName}
              >
                {content}
              </span>
            );
          }

          if (requiresPremium) {
            return (
              <button
                key={`${item.label}-${item.href}`}
                type="button"
                onClick={() => {
                  trackNavigationClick({
                    label: item.label,
                    href: item.href,
                    location: "app_sidebar",
                    authState: isAuthenticated ? "authenticated" : "guest",
                  });
                  if (!isPremium) {
                    setShowAnalyticsPremiumModal(true);
                    setIsMobileOpen(false);
                    return;
                  }
                  setIsMobileOpen(false);
                  emitNavigationStart(item.href);
                  router.push(item.href);
                }}
                className={cn(itemClassName, "w-full text-left")}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              onClick={(event) => {
                trackNavigationClick({
                  label: item.label,
                  href: item.href,
                  location: "app_sidebar",
                  authState: isAuthenticated ? "authenticated" : "guest",
                });
                if (requiresPremium && !isPremium) {
                  event.preventDefault();
                  setShowAnalyticsPremiumModal(true);
                  setIsMobileOpen(false);
                  return;
                }
                setIsMobileOpen(false);
                emitNavigationStart(item.href);
              }}
              className={itemClassName}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col gap-4">
      <SidebarNavigation />
      <div className="border-t border-border pt-2">
        <ThemeToggle />
      </div>
      <div>
        <SidebarPremiumCard />
      </div>
    </div>
  );

  return (
    <div className="relative flex w-full flex-1 flex-col items-start bg-background px-4 pb-6 pt-3 text-foreground transition-colors sm:px-6 md:pb-8 md:pt-4 lg:flex-row lg:gap-0 lg:px-0 lg:py-0">
      {/* Mobile sidebar is opened from the global header menu button (see SiteShell). */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-[17.5rem] border-r border-border bg-background p-5 text-foreground shadow-2xl flex flex-col gap-5 lg:hidden transition-transform duration-300 ease-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between pb-2">
          <SidebarBrand />
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="h-8 w-8 rounded-full hover:bg-muted/50 -mr-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pb-6 no-scrollbar">
          <SidebarContent />
        </div>
      </div>

      <aside className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block w-[16.5rem] shrink-0 border-r border-border bg-background",
        sidebar === "collapsed" ? "lg:hidden" : "lg:block"
      )}>
        <div className="flex h-full flex-col gap-4 p-4">
          <SidebarBrand />
          <div
            className={cn(
              "flex-1 min-h-0 overscroll-contain scroll-smooth flex flex-col gap-4 overflow-y-auto no-scrollbar",
            )}
            style={{
              scrollbarGutter: "stable"
            }}
          >
            <SidebarNavigation />
          </div>
          <div className="shrink-0">
            <SidebarPremiumCard />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 w-full animate-in fade-in duration-500 ease-out lg:ml-[16.5rem] lg:px-5 lg:py-5 xl:px-6">
        <div className="mx-auto w-full max-w-[82rem]">
          {isPendingExamPreview ? (
            <ExamRouteLoadingFrame />
          ) : pendingNavigationHref ? (
            <AppLoadingPlaceholder
              pathname={pendingNavigationPathname ?? undefined}
              className="min-h-[calc(100vh-7rem)] px-0 py-0"
            />
          ) : (
            children
          )}
        </div>
      </main>

      {showAnalyticsPremiumModal ? (
        <PremiumUpgradeModal
          title="Analytics is Premium"
          description="Detailed analytics and skill insights are available for Premium users."
          subscriptionHref={subscriptionHref}
          onClose={() => setShowAnalyticsPremiumModal(false)}
        />
      ) : null}
    </div>
  );
}
