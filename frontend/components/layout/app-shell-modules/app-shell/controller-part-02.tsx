"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { Flame, Link, SidebarPremiumCard, Sparkles, Trophy, cn, emitNavigationStart, trackNavigationClick } from "../dependencies";
import { formatCompactNumber } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { pathname, router, isAuthenticated, isPremium, setIsMobileOpen, xpSummary, setShowAnalyticsPremiumModal, pendingNavigationPathname, navItems } = scope;
  const SidebarNavigation = () => (
      <div className="bg-white dark:bg-slate-950">
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
                ? "cursor-not-allowed text-slate-400 opacity-55 grayscale dark:text-slate-600"
                : active
                ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            );
            const iconClassName = cn(
              "h-4 w-4",
              disabled
                ? "text-slate-400 dark:text-slate-600"
                : active
                ? "text-orange-600 dark:text-orange-300"
                : "text-slate-400 dark:text-slate-500"
            );
            const content = (
              <>
                <Icon className={iconClassName} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {"badge" in item ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
                      disabled && "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
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

  const SidebarXpCard = () => {
      if (!xpSummary) {
        return null;
      }
  
      const progress = Math.max(0, Math.min(xpSummary.progress.progressPercent, 100));
  
      return (
        <Link
          href="/leaderboard"
          className="group block overflow-hidden rounded-xl border border-border/50 bg-card/70 p-3 shadow-sm transition-all hover:border-primary/30 hover:bg-card"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                {"PrimeScore XP"}
              </div>
              <p className="mt-1 text-xl font-black tracking-tight text-foreground">
                {formatCompactNumber(xpSummary.totalXp)}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
            <div className="rounded-lg border border-border/50 bg-background/70 px-2.5 py-2">
              <span className="text-muted-foreground">{"Level"}</span>
              <span className="ml-1 text-foreground">{xpSummary.level}</span>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/70 px-2.5 py-2">
              <Flame className="mr-1 inline h-3.5 w-3.5 text-orange-500" />
              <span className="text-foreground">{xpSummary.currentStreak}d</span>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-400 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Link>
      );
    };

  const SidebarContent = () => (
      <div className="flex flex-col gap-4">
        <SidebarNavigation />
        <div>
          <SidebarPremiumCard />
        </div>
      </div>
    );

  return { SidebarNavigation, SidebarXpCard, SidebarContent };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
