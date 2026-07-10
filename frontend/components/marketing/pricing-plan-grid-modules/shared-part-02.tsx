"use client";

import { ArrowRight, Badge, Button, Card, Link, cn } from "./dependencies";

import { getStateCopy } from "./shared-part-01";



export function PricingStateCard({
  compact,
  stateCopy,
}: {
  compact: boolean;
  stateCopy: ReturnType<typeof getStateCopy>;
}) {
  const StateIcon = stateCopy.icon;

  return (
    <Card className={cn(
      "overflow-hidden rounded-[2rem] border border-border/50 bg-card/80 backdrop-blur-xl shadow-sm",
      compact ? "p-0" : "p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]",
    )}>
      <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <div className={cn(
        "grid items-center gap-5",
        compact ? "px-5 py-5 md:grid-cols-[1fr_auto]" : "px-6 py-6 md:grid-cols-[1fr_auto]",
      )}>
        <div className="space-y-2">
          <Badge tone="secondary" className="bg-primary/10 text-primary">
            {stateCopy.badge}
          </Badge>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <StateIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className={cn("font-semibold tracking-tight text-foreground leading-tight", compact ? "text-lg" : "text-lg md:text-xl")}>
                {stateCopy.title}
              </p>
              <p className="max-w-2xl text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground">
                {stateCopy.description}
              </p>
            </div>
          </div>
        </div>

        <Button asChild className="h-12 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-primary/15">
          <Link href={stateCopy.href}>
            {stateCopy.action}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
