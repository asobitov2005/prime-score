"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function TestsRefreshOnMount() {
  const searchParams = useSearchParams();
  const refreshToken = searchParams.get("refresh");

  useEffect(() => {
    if (!refreshToken || typeof window === "undefined") {
      return;
    }

    // Navigating here with a unique `refresh` token already produces a fresh
    // server render (the route is dynamic), so there's no need to call
    // router.refresh() again — doing so caused a visible double render that felt
    // like the screen auto-reloading when returning from a test. We just strip
    // the token from the URL silently so it doesn't linger.
    const url = new URL(window.location.href);
    url.searchParams.delete("refresh");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [refreshToken]);

  return null;
}
