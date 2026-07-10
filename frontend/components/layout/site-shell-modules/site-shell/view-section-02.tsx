"use client";
import type { SiteShellScope } from "./controller";
import { NavigationTransitionOverlay, Suspense } from "../dependencies";

export function SiteShellSection2({ scope }: { scope: SiteShellScope }) {
  return (
    <Suspense fallback={null}>
            <NavigationTransitionOverlay />
          </Suspense>
  );
}
