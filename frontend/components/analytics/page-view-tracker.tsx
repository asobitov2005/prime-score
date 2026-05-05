"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackPageView } from "@/lib/analytics";

function resolvePageGroup(pathname: string) {
  if (pathname === "/") {
    return "home";
  }

  const [firstSegment] = pathname.split("/").filter(Boolean);
  return firstSegment ?? "unknown";
}

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

    if (lastTrackedRef.current === pagePath) {
      return;
    }

    lastTrackedRef.current = pagePath;

    trackPageView({
      pagePath,
      pageLocation: window.location.href,
      pageTitle: document.title,
      pageGroup: resolvePageGroup(pathname),
      queryString,
    });
  }, [pathname, searchParams]);

  return null;
}
