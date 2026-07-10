"use client";
import type { PlanManagerScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Eye, EyeOff, Pencil, PrimePremiumIcon, Sparkles, cn } from "../dependencies";
import { formatMoney } from "../shared";

export function PlanManagerSection5({ scope }: { scope: PlanManagerScope }) {
  const { plans, openEdit } = scope;
  return (
    {plans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-sm font-medium text-muted-foreground">
                No subscription plans are configured yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-3">
              {plans.map((plan) => {
                const monthlyCost = plan.durationDays > 0 ? (plan.price / plan.durationDays) * 30 : plan.price;
                const previewPerks = plan.perks.slice(0, 4);
                const hiddenPerks = Math.max(0, plan.perks.length - previewPerks.length);
    
                return (
                  <Card key={plan.id} className={cn(
                    "overflow-hidden border-border/60",
                    plan.isFeatured && "border-primary/30 shadow-[0_16px_40px_-24px_rgba(217,75,4,0.45)]",
                  )}>
                    <CardHeader className="space-y-4 border-b border-border/40 bg-muted/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {plan.badgeLabel ? (
                              <Badge tone={plan.isFeatured ? "info" : "neutral"}>{plan.badgeLabel}</Badge>
                            ) : null}
                            <Badge tone={plan.isActive ? "success" : "warning"}>
                              {plan.isActive ? "Live" : "Hidden"}
                            </Badge>
                          </div>
                          <div>
                            <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                            <CardDescription>{plan.durationDays} days • Order {plan.displayOrder}</CardDescription>
                          </div>
                        </div>
    
                        <div className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl border shadow-inner",
                          plan.isFeatured
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground",
                        )}>
                          {plan.isFeatured ? <PrimePremiumIcon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                        </div>
                      </div>
    
                      <div className="space-y-1">
                        <p className="text-2xl font-semibold tracking-tight text-foreground">{formatMoney(plan.price)}</p>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Approx. {formatMoney(monthlyCost)} / 30 days
                        </p>
                      </div>
                    </CardHeader>
    
                    <CardContent className="space-y-4 p-6">
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {previewPerks.map((perk) => (
                          <li key={perk} className="leading-relaxed">
                            {perk}
                          </li>
                        ))}
                        {hiddenPerks > 0 ? (
                          <li className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                            +{hiddenPerks} more
                          </li>
                        ) : null}
                      </ul>
    
                      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          {plan.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {plan.isActive ? "Visible on user pricing" : "Hidden from user pricing"}
                        </div>
    
                        <Button type="button" variant="outline" onClick={() => openEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
  );
}
