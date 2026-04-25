"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function TestsRefreshOnMount() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshToken = searchParams.get("refresh");

  useEffect(() => {
    if (!refreshToken || typeof window === "undefined") {
      return;
    }

    const storageKey = `prime-tests-refresh:${refreshToken}`;
    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");
    router.refresh();
  }, [refreshToken, router]);

  return null;
}
