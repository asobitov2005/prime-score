"use client";
import type { SiteShellScope } from "./controller";
import { NavLink, PracticeTestsMenu } from "../shared";

export function SiteShellSection7({ scope }: { scope: SiteShellScope }) {
  const { isAppRoute, isMockTestsOpen, currentPath, isAuthenticated, setIsMockTestsOpen } = scope;
  return (
    {!isAppRoute ? (
              <nav className="ml-auto mr-4 hidden items-center gap-1 md:flex">
                <PracticeTestsMenu
                  isOpen={isMockTestsOpen}
                  currentPath={currentPath}
                  isAuthenticated={isAuthenticated}
                  onOpenChange={setIsMockTestsOpen}
                  variant="marketing"
                />
                <NavLink href="/#features" label={"Features"} variant="marketing" />
                <NavLink href="/#pricing" label={"Pricing"} variant="marketing" />
                <NavLink href="/#reviews" label={"Reviews"} variant="marketing" />
                <NavLink href="/#about" label={"About"} variant="marketing" />
              </nav>
              ) : null}
  );
}
