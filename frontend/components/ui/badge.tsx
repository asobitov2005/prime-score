import { cn } from "@/lib/utils";

type BadgeTone = "default" | "secondary" | "success" | "warning" | "danger" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20",
  danger: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20",
  outline: "border border-border bg-background text-muted-foreground"
};

export function Badge({ className, tone, variant, ...props }: BadgeProps) {
  const resolvedTone = tone ?? variant ?? "default";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        toneClasses[resolvedTone],
        className
      )}
      {...props}
    />
  );
}
