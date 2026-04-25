"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HIDE_AFTER_SCROLL_PX = 120;
const SHOW_AFTER_SCROLL_PX = 8;
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
          setIsHidden(false);
        } else if (delta > 0) {
          downwardDistance.current += delta;

          if (downwardDistance.current >= HIDE_AFTER_SCROLL_PX) {
            setIsHidden(true);
          }
        } else if (delta <= -SHOW_AFTER_SCROLL_PX) {
          downwardDistance.current = 0;
          setIsHidden(false);
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
    <div
      className={cn(
        className,
        "transition-[transform,opacity] duration-500 ease-out will-change-transform",
        isHidden ? "-translate-y-[140%] opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
      )}
    >
      {children}
    </div>
  );
}
