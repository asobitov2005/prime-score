"use client";
import type { BaseScope } from "./base";
import { ApiError, buildUserDisplayName, createApiClient, emitNavigationStart, listenNotificationRefresh, refreshClientUserAccessToken, setPendingPublicRedirect, trackLogout, trackUiInteraction, useAuthStore, useEffect, usePathname, useRouter, useState } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
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

  return { theme, setTheme, isAuthenticated, name, phoneNumber, avatarUrl, sessionId, refreshToken, clearSession, syncSession, hasHydrated, welcomeBonusDays, dismissWelcomeBonus, isPremium, premiumUntil, showWelcomeBonusModal, setShowWelcomeBonusModal, isMenuOpen, setIsMenuOpen, isMockTestsOpen, setIsMockTestsOpen, isMobileNavOpen, setIsMobileNavOpen, mounted, setMounted, notifOpen, setNotifOpen, notifications, setNotifications, currentPath, router, unreadCount, isAppRoute, hideSiteChrome, welcomeBonusVisible, fetchNotifications, markAllRead, toggleTheme, handleSignOut };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
