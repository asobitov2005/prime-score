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
  const [contentHeight, setContentHeight] = useState(0);
  const lastScrollY = useRef(0);
  const downwardDistance = useRef(0);
  const isTicking = useRef(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      setContentHeight(node.scrollHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [children]);

  return (
    <div className={cn("relative isolate", className)}>
      <div
        className={cn(
          "relative overflow-hidden transition-[max-height,transform,opacity] duration-500 ease-out will-change-[max-height,transform,opacity] motion-reduce:transition-none",
          isHidden ? "-translate-y-3 opacity-0" : "translate-y-0 opacity-100",
        )}
        style={{ maxHeight: isHidden ? 0 : contentHeight || undefined }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-background shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.35)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-b from-background/0 via-background/90 to-background"
        />
        <div ref={contentRef} className={cn("relative z-20", isHidden && "pointer-events-none")}>
          {children}
        </div>
      </div>
    </div>
  );
}
