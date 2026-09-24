"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PRIME_NAVIGATION_START_EVENT } from "@/lib/navigation-transition";

const SHOW_DELAY_MS = 140;
const MAX_VISIBLE_MS = 10_000;

export function NavigationTransitionOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Any committed route (including redirects and query changes) finishes progress.
    setIsVisible(false);
    let showTimer: number | undefined;
    let timeout: number | undefined;
    const clearTimers = () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(timeout);
    };
    const finish = () => {
      clearTimers();
      setIsVisible(false);
    };
    const start = (href: string) => {
      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (`${url.pathname}${url.search}` === currentHref) {
        finish();
        return;
      }
      clearTimers();
      showTimer = window.setTimeout(() => setIsVisible(true), SHOW_DELAY_MS);
      timeout = window.setTimeout(finish, MAX_VISIBLE_MS);
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (href && !href.startsWith("#")) start(href);
    };
    const handleNavigation = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail?.href === "string") start(event.detail.href);
    };
    document.addEventListener("click", handleClick, true);
    window.addEventListener(PRIME_NAVIGATION_START_EVENT, handleNavigation);
    window.addEventListener("popstate", finish);
    window.addEventListener("pageshow", finish);
    return () => {
      clearTimers();
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener(PRIME_NAVIGATION_START_EVENT, handleNavigation);
      window.removeEventListener("popstate", finish);
      window.removeEventListener("pageshow", finish);
    };
  }, [currentHref]);

  if (!isVisible) return null;
  return (
    <div aria-hidden data-navigation-progress className="pointer-events-none fixed inset-x-0 top-0 z-[120]">
      <div className="relative h-[2px] w-full overflow-hidden bg-border/35">
        <div className="absolute inset-y-0 left-0 w-[28%] rounded-r-full bg-primary [animation:prime-route-progress_1.15s_cubic-bezier(0.45,0,0.25,1)_infinite] motion-reduce:animate-none" />
      </div>
    </div>
  );
}
