"use client";
import type { SiteShellScope } from "./controller";
import { cn } from "../dependencies";

export function SiteShellSection9({ scope }: { scope: SiteShellScope }) {
  const { isAppRoute, setIsMobileNavOpen, isMobileNavOpen } = scope;
  return (
    {!isAppRoute ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMobileNavOpen((v) => !v);
                    }}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-950 shadow-sm backdrop-blur transition-all hover:border-orange-200 hover:bg-orange-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-orange-500/10 md:hidden"
                    aria-label={"Menu"}
                    aria-expanded={isMobileNavOpen}
                  >
                    <span className="sr-only">{"Menu"}</span>
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                        !isAppRoute && "bg-slate-950 dark:bg-slate-100",
                        isMobileNavOpen ? "rotate-45 translate-y-0" : "-translate-y-[5px]"
                      )}
                    />
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                        !isAppRoute && "bg-slate-950 dark:bg-slate-100",
                        isMobileNavOpen ? "opacity-0" : "translate-y-0 opacity-100"
                      )}
                    />
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300",
                        !isAppRoute && "bg-slate-950 dark:bg-slate-100",
                        isMobileNavOpen ? "-rotate-45 translate-y-0" : "translate-y-[5px]"
                      )}
                    />
                  </button>
                ) : null}
  );
}
