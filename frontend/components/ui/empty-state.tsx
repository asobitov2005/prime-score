"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie, EventType } from "@lottiefiles/dotlottie-web";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  href: string;
  label: string;
}

type EmptyStateIcon =
  | "book"
  | "clock"
  | "clock3"
  | "gem"
  | "layers"
  | "medal"
  | "mic"
  | "monitor"
  | "pen"
  | "search"
  | "search-x"
  | "trophy"
  | "trending"
  | "wallet";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  icon?: EmptyStateIcon;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (dotLottie?.isLoaded || dotLottie?.isReady) {
      setIsReady(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setIsReady(true), 900);

    if (!dotLottie) {
      return () => window.clearTimeout(timeoutId);
    }

    const markReady = () => {
      window.clearTimeout(timeoutId);
      setIsReady(true);
    };
    const events: EventType[] = ["ready", "load", "render"];
    events.forEach((event) => dotLottie.addEventListener(event, markReady));

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((event) => dotLottie.removeEventListener(event, markReady));
    };
  }, [dotLottie]);

  return (
    <Card className={cn("overflow-hidden rounded-[2rem] border-border/60 bg-card/75 shadow-sm", className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center text-center transition-all duration-300 ease-out",
          isReady ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          compact ? "px-5 py-7" : "px-6 py-10"
        )}
      >
        <div className={cn("relative", compact ? "h-32 w-32" : "h-44 w-44")}>
          <DotLottieReact
            src="/animations/empty-state.lottie"
            autoplay
            loop
            className="h-full w-full"
            dotLottieRefCallback={setDotLottie}
          />
        </div>

        <div className={cn("space-y-2", compact ? "mt-2" : "mt-4")}>
          <h2 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-lg" : "text-2xl")}>{title}</h2>
          {description ? (
            <p className="mx-auto max-w-md text-sm font-medium leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {(action || secondaryAction) ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {action ? (
              <Button asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button asChild variant="outline">
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
