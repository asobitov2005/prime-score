"use client";

import { BookOpen, ChevronDown, Headphones, Link, Mic, PenSquare, ReactNode, cn, trackNavigationClick, useEffect, useRef } from "./dependencies";

import { PracticeDropdownLink } from "./shared-part-02";



export interface SiteShellProps {
  children: ReactNode;
}

export function NavLink({
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

export function PracticeTestsMenu({
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
            href="/speaking"
            label="Speaking"
            description={"Mock online"}
            icon={<Mic className="h-4 w-4" />}
            accentClassName="bg-orange-500/10 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300"
            isAuthenticated={isAuthenticated}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </div>
    </div>
  );
}
