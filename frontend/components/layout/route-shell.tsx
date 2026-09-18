"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { LandingHeader } from "@/components/marketing/landing-header";

// Keep dashboard menus, notifications and loading overlays out of the landing bundle.
const SiteShell = dynamic(
  () => import("./site-shell").then((module) => module.SiteShell),
  {
    loading: () => (
      <div
        role="status"
        className="grid min-h-[70vh] place-items-center text-sm text-muted-foreground"
      >
        Opening your workspace...
      </div>
    ),
  },
);

export function RouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/" ? (
    <>
      <LandingHeader />
      {children}
    </>
  ) : (
    <SiteShell>{children}</SiteShell>
  );
}
