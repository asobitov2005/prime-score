"use client";

import { Link, ReactNode, cn, trackNavigationClick } from "./dependencies";



export function PracticeDropdownLink({
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

export function MobilePracticeLink({
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

export function MobileNavLink({
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
