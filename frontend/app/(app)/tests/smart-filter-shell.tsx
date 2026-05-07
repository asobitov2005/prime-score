"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HIDE_AFTER_SCROLL_PX = 380;
const SHOW_AFTER_SCROLL_PX = 32;
const TOP_RESET_PX = 80;

interface SmartFilterShellProps {
  children: ReactNode;
  className?: string;
}

export function SmartFilterShell({ children, className }: SmartFilterShellProps) {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const downwardDistance = useRef(0);
  const isTicking = useRef(false);
  const isHiddenRef = useRef(false);

  const updateHidden = (nextHidden: boolean) => {
    if (isHiddenRef.current === nextHidden) {
      return;
    }

    isHiddenRef.current = nextHidden;
    setIsHidden(nextHidden);
  };

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (isTicking.current) return;

      isTicking.current = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        if (currentScrollY <= TOP_RESET_PX) {
          downwardDistance.current = 0;
          updateHidden(false);
        } else if (delta > 0) {
          downwardDistance.current += delta;

          if (downwardDistance.current >= HIDE_AFTER_SCROLL_PX) {
            updateHidden(true);
          }
        } else if (delta <= -SHOW_AFTER_SCROLL_PX) {
          downwardDistance.current = 0;
          updateHidden(false);
        }

        lastScrollY.current = currentScrollY;
        isTicking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className={cn("relative isolate z-40 transform-gpu", className)}>
      <div
        className={cn(
          "relative transition-transform duration-300 ease-out will-change-transform transform-gpu bg-background",
          isHidden ? "-translate-y-full opacity-0 pointer-events-none absolute" : "translate-y-0 opacity-100 relative",
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-background shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.35)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-b from-background/0 via-background/90 to-background"
        />
        <div className="relative z-20">
          {children}
        </div>
      </div>
    </div>
  );
}
