"use client";
import type { SiteShellScope } from "./controller";
import { Bell, Button, ChevronDown, LayoutDashboard, Link, LogOut, Moon, PrimePremiumIcon, Settings2, Sun, User, cn, trackCtaClick } from "../dependencies";
import { NavLink, PracticeTestsMenu } from "../shared";
import { SiteShellSection5 } from "./view-section-10";

export function SiteShellSection4({ scope }: { scope: SiteShellScope }) {
  const { isAppRoute, isMockTestsOpen, currentPath, isAuthenticated, setIsMockTestsOpen, toggleTheme, theme, setIsMobileNavOpen, isMobileNavOpen, isPremium, mounted, hasHydrated, setNotifOpen, notifOpen, fetchNotifications, unreadCount, markAllRead, notifications, setIsMenuOpen, isMenuOpen, name, avatarUrl, phoneNumber, handleSignOut } = scope;
  return (
    <header 
            className={cn(
              "sticky top-0 z-50 flex h-14 shrink-0 items-center md:h-16",
              isAppRoute
                ? "border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/95 lg:ml-[16.5rem] lg:w-[calc(100%-16.5rem)]"
                : "border-b border-slate-200/60 bg-white/70 shadow-[0_8px_32px_-18px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/70"
            )}
          >
            <SiteShellSection5 scope={scope} />
          </header>
  );
}
