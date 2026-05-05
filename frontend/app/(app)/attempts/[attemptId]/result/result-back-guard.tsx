"use client";

import { useEffect } from "react";

import type { TestType } from "@/lib/types";

export function ResultBackGuard({ testType }: { testType: TestType }) {
  useEffect(() => {
    const targetHref = `/tests?type=${testType}&refresh=${Date.now()}`;

    const handlePopState = () => {
      window.location.replace(targetHref);
    };

    window.history.pushState({ resultBackGuard: true }, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [testType]);

  return null;
}
