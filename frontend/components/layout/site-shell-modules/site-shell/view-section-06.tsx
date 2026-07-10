"use client";
import type { SiteShellScope } from "./controller";
import { Link } from "../dependencies";

export function SiteShellSection6({ scope }: { scope: SiteShellScope }) {
  const { isAppRoute } = scope;
  return (
    {isAppRoute ? (
                <>
                  <Link href="/" className="flex h-10 min-w-0 shrink -translate-y-0.5 items-center gap-2 rounded-xl lg:hidden">
                    <img src="/logo-light.svg" alt="PrimeScore" className="h-6 w-auto shrink-0 object-contain dark:hidden" />
                    <img src="/logo.svg" alt="PrimeScore" className="hidden h-6 w-auto shrink-0 object-contain dark:block" />
                    <span className="flex h-6 min-w-0 items-center" aria-hidden="true">
                      <img src="/exam-logo-lightmode.svg" alt="" className="h-full w-auto max-w-full object-contain dark:hidden" />
                      <img src="/exam-logo-darkmode.svg" alt="" className="hidden h-full w-auto max-w-full object-contain dark:block" />
                    </span>
                  </Link>
                </>
              ) : (
                <Link href="/" className="flex min-w-0 shrink -translate-y-0.5 items-center gap-2 rounded-xl group focus-visible:outline-none sm:gap-2.5">
                  <div className="relative flex h-6 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-105 md:h-8">
                    <img src="/logo-light.svg" alt="PrimeScore" className="relative z-10 h-full w-auto object-contain drop-shadow-sm dark:hidden" />
                    <img src="/logo.svg" alt="PrimeScore" className="relative z-10 hidden h-full w-auto object-contain drop-shadow-sm dark:block" />
                  </div>
                  <span className="flex h-6 min-w-0 items-center md:h-9" aria-hidden="true">
                    <img src="/exam-logo-lightmode.svg" alt="" className="h-full w-auto max-w-full object-contain dark:hidden" />
                    <img src="/exam-logo-darkmode.svg" alt="" className="hidden h-full w-auto max-w-full object-contain dark:block" />
                  </span>
                </Link>
              )}
  );
}
