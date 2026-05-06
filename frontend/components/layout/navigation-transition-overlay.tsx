"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PRIME_NAVIGATION_START_EVENT } from "@/lib/navigation-transition";

const SHOW_DELAY_MS = 140;
const MIN_VISIBLE_MS = 220;
const MAX_VISIBLE_MS = 10_000;
const FADE_OUT_MS = 180;

export function NavigationTransitionOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const currentHref = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const currentHrefRef = useRef(currentHref);
  const targetHrefRef = useRef<string | null>(null);
  const visibleAtRef = useRef(0);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const failSafeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    currentHrefRef.current = currentHref;
  }, [currentHref]);

  const clearTimers = () => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (failSafeTimerRef.current !== null) {
      window.clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }
  };

  const finishNavigation = () => {
    if (!isMounted) {
      clearTimers();
      targetHrefRef.current = null;
      return;
    }

    const elapsed = Date.now() - visibleAtRef.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);

      window.setTimeout(() => {
        setIsMounted(false);
        targetHrefRef.current = null;
      }, FADE_OUT_MS);
    }, delay);
  };

  const startNavigation = (nextHref: string) => {
    if (nextHref === currentHrefRef.current) {
      return;
    }

    clearTimers();
    targetHrefRef.current = nextHref;
    visibleAtRef.current = 0;
    setIsMounted(false);
    setIsVisible(false);

    showTimerRef.current = window.setTimeout(() => {
      if (targetHrefRef.current !== nextHref) {
        return;
      }

      visibleAtRef.current = Date.now();
      setIsMounted(true);
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    failSafeTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      window.setTimeout(() => {
        setIsMounted(false);
        targetHrefRef.current = null;
      }, FADE_OUT_MS);
    }, MAX_VISIBLE_MS);
  };

  useEffect(() => {
    const handleClickCapture = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const nextHref = `${nextUrl.pathname}${nextUrl.search}`;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextHref === currentUrl) {
        return;
      }

      startNavigation(nextHref);
    };

    const handleProgrammaticNavigation = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail?.href || typeof event.detail.href !== "string") {
        return;
      }

      startNavigation(event.detail.href);
    };

    document.addEventListener("click", handleClickCapture, true);
    window.addEventListener(PRIME_NAVIGATION_START_EVENT, handleProgrammaticNavigation);

    return () => {
      document.removeEventListener("click", handleClickCapture, true);
      window.removeEventListener(PRIME_NAVIGATION_START_EVENT, handleProgrammaticNavigation);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!targetHrefRef.current || !isMounted) {
      return;
    }

    if (currentHref === targetHrefRef.current) {
      finishNavigation();
    }
  }, [currentHref, isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={isVisible ? "pointer-events-none fixed inset-x-0 top-0 z-[120] opacity-100 transition-opacity duration-200" : "pointer-events-none fixed inset-x-0 top-0 z-[120] opacity-0 transition-opacity duration-150"}
    >
      <div className="relative h-[2px] w-full overflow-hidden bg-border/35">
        <div className="absolute inset-y-0 left-0 w-[28%] rounded-r-full bg-gradient-to-r from-transparent via-primary to-orange-300 shadow-[0_0_14px_rgba(255,145,0,0.36)] [animation:prime-route-progress_1.15s_cubic-bezier(0.45,0,0.25,1)_infinite]" />
      </div>
    </div>
  );
}
