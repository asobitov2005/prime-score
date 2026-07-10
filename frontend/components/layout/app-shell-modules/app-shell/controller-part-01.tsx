"use client";
import type { BaseScope } from "./base";
import { AppRouteLoadingFrame, Award, BarChart3, BookMarked, BookOpenText, CreditCard, Gauge, History, Link, Mic, PRIME_NAVIGATION_START_EVENT, PenTool, Settings2, Trophy, XpSummary, consumePendingPublicRedirect, createApiClient, getSubscriptionPageHref, useAuthStore, useEffect, usePathname, useRouter, useState, useUIStore } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
  const pathname = usePathname();

  const router = useRouter();

  const { sidebar } = useUIStore();

  const { isAuthenticated, hasHydrated, isPremium } = useAuthStore();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [isTestsSubmenuOpen, setIsTestsSubmenuOpen] = useState(false);

  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);

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
      { href: "/achievements", label: "Achievements", icon: Award },
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
    }, [pathname]);

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
      if (pathname.startsWith("/tests")) {
        setIsTestsSubmenuOpen(true);
        return;
      }
      setIsTestsSubmenuOpen(false);
    }, [pathname]);

  useEffect(() => {
      if (!hasHydrated || !isAuthenticated) {
        setXpSummary(null);
        return;
      }
  
      let ignore = false;
      createApiClient()
        .getXpSummary()
        .then((summary) => {
          if (!ignore) {
            setXpSummary(summary);
          }
        })
        .catch(() => {
          if (!ignore) {
            setXpSummary({
              totalXp: 0,
              level: 1,
              currentStreak: 0,
              bestStreak: 0,
              weeklyXp: 0,
              monthlyXp: 0,
              latestXpGain: null,
              progress: {
                level: 1,
                levelFloorXp: 0,
                nextLevelXp: 100,
                xpIntoLevel: 0,
                xpNeededForNextLevel: 100,
                progressPercent: 0,
              },
            });
          }
        });
  
      return () => {
        ignore = true;
      };
    }, [hasHydrated, isAuthenticated]);

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

  return { pathname, router, sidebar, isAuthenticated, hasHydrated, isPremium, isMobileOpen, setIsMobileOpen, isTestsSubmenuOpen, setIsTestsSubmenuOpen, xpSummary, setXpSummary, pendingNavigationHref, setPendingNavigationHref, showAnalyticsPremiumModal, setShowAnalyticsPremiumModal, isPublicTestsRoute, subscriptionHref, pendingNavigationPathname, isPendingExamPreview, navItems, SidebarBrand };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
