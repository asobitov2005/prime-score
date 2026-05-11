"use client";

import { useLayoutEffect } from "react";
import {
  endAdminSession,
  fetchAdminApi,
  getAdminAccessTokenExpiresAt,
  getClientAdminAccessToken,
  isAdminAccessTokenExpired,
  refreshClientAdminSession,
} from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function isAdminApiRequest(input: RequestInfo | URL): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const url = new URL(requestUrl(input), window.location.origin);
    return url.href.startsWith(ADMIN_PUBLIC_API_BASE_URL) || url.pathname.startsWith("/api/admin");
  } catch {
    return false;
  }
}

export function AdminSessionGuard() {
  useLayoutEffect(() => {
    let expiryTimer: number | null = null;
    const originalFetch = window.fetch.bind(window);
    let refreshInFlight: Promise<boolean> | null = null;

    function clearExpiryTimer() {
      if (expiryTimer) {
        window.clearTimeout(expiryTimer);
        expiryTimer = null;
      }
    }

    function refreshSession() {
      if (!refreshInFlight) {
        refreshInFlight = refreshClientAdminSession(originalFetch).finally(() => {
          refreshInFlight = null;
        });
      }
      return refreshInFlight;
    }

    async function enforceTokenExpiry() {
      const token = getClientAdminAccessToken();
      if (!token || isAdminAccessTokenExpired(token)) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          endAdminSession();
          return;
        }
      }

      const nextToken = getClientAdminAccessToken();
      if (!nextToken || isAdminAccessTokenExpired(nextToken)) {
        endAdminSession();
        return;
      }

      const expiresAt = getAdminAccessTokenExpiresAt(nextToken);
      clearExpiryTimer();
      if (expiresAt !== null) {
        expiryTimer = window.setTimeout(() => {
          void enforceTokenExpiry();
        }, Math.max(0, expiresAt - Date.now() - 30_000));
      }
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isAdminApiRequest(input)) {
        return originalFetch(input, init);
      }

      return fetchAdminApi(input, init, { fetchImpl: originalFetch });
    };

    void enforceTokenExpiry();
    const handleFocus = () => {
      void enforceTokenExpiry();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void enforceTokenExpiry();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearExpiryTimer();
      window.fetch = originalFetch;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
