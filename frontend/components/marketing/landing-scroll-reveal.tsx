"use client";

import type { ReactNode, RefObject } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

export function LandingScrollReveal({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const [ref, inView] = useInView({ threshold: 0.1 });

  return (
    <div
      ref={ref as RefObject<HTMLDivElement>}
      id={id}
      className={cn(
        className,
        "transition-[opacity,transform] duration-700 ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
      )}
    >
      {children}
    </div>
  );
}
