"use client";
import type { SiteShellScope } from "./controller";
import { Bell, BookOpen, Button, CSSProperties, CalendarDays, ChevronDown, Dialog, Headphones, LayoutDashboard, Link, LogOut, Mic, Moon, NavigationTransitionOverlay, PenSquare, PrimePremiumIcon, Settings2, Sun, Suspense, User, cn, trackCtaClick } from "../dependencies";
import { MobileNavLink, MobilePracticeLink, NavLink, PracticeTestsMenu } from "../shared";
import { SiteShellSection2 } from "./view-section-02";
import { SiteShellSection3 } from "./view-section-03";
import { SiteShellSection4 } from "./view-section-10";
import { SiteShellSection11 } from "./view-section-11";
import { SiteShellSection12 } from "./view-section-12";

export function SiteShellView1({ scope }: { scope: SiteShellScope }) {
  const { isAppRoute, welcomeBonusVisible, showWelcomeBonusModal, welcomeBonusDays, closeWelcomeBonusModal, isMockTestsOpen, currentPath, isAuthenticated, setIsMockTestsOpen, toggleTheme, theme, setIsMobileNavOpen, isMobileNavOpen, isPremium, mounted, hasHydrated, setNotifOpen, notifOpen, fetchNotifications, unreadCount, markAllRead, notifications, setIsMenuOpen, isMenuOpen, name, avatarUrl, phoneNumber, handleSignOut, children } = scope;
  return (
    (
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
          <SiteShellSection2 scope={scope} />
    
          <SiteShellSection3 scope={scope} />
    
          <SiteShellSection4 scope={scope} />
    
          <SiteShellSection11 scope={scope} />
    
          <SiteShellSection12 scope={scope} />
    
        </div>
      )
  );
}
