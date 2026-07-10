import { Card, CardContent, CardDescription, CardHeader, CardTitle, ReactNode, cn } from "./dependencies";



export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/80">
      <div
        className={cn(
          "absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full blur-2xl",
          tone === "success" && "bg-success/20",
          tone === "warning" && "bg-warning/20",
          tone === "danger" && "bg-danger/20",
          tone === "neutral" && "bg-primary/15"
        )}
      />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</CardDescription>
          <CardTitle className="mt-2 text-3xl font-black tracking-tight">{value}</CardTitle>
        </div>
        <div className="rounded-xl border border-border bg-background/70 p-2 text-primary">{icon}</div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-xs font-semibold text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
