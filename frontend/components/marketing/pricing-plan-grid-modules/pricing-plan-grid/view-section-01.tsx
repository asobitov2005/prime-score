"use client";
import type { PricingPlanGridScope } from "./controller";
import { ArrowRight, Badge, Button, Card, CardContent, CardHeader, CardTitle, CheckCircle2, Link, PrimePremiumIcon, Sparkles, cn, trackPlanSelect } from "../dependencies";
import { AnimatedItem, PricingStateCard, calculateSavingsAmount, calculateSavingsPercent, formatPlanMoney, getPlanAction } from "../shared";

export function PricingPlanGridView1({ scope }: { scope: PricingPlanGridScope }) {
  const { showStateCard, animateInView, compact, stateCopy, plans, emptyState, planGridClassName, activePlanId, viewerState, subscriptionHref, baselinePlan, onChoosePlan, paymentBusyPlanId, denseCards, showPlanNotes } = scope;
  return (
    (
        <div className="space-y-6">
          {showStateCard ? (
            <AnimatedItem animateInView={animateInView}>
              <PricingStateCard compact={compact} stateCopy={stateCopy} />
            </AnimatedItem>
          ) : null}
    
          {plans.length === 0 ? emptyState : (
          <div className={cn("grid gap-5", planGridClassName)}>
            {plans.map((plan, index) => {
              const isFeatured = plan.isFeatured;
              const isCurrentPlan = activePlanId === plan.id;
              const action = getPlanAction(viewerState, isCurrentPlan, subscriptionHref);
              const savings = calculateSavingsPercent(plan, baselinePlan);
              const savingsAmount = calculateSavingsAmount(plan, baselinePlan);
              const compareAtPrice = savingsAmount > 0 ? plan.numericPrice + savingsAmount : 0;
              const isInvoiceAction = Boolean(onChoosePlan) && viewerState !== "guest" && !action.disabled;
              const ctaLabel = isInvoiceAction
                ? paymentBusyPlanId === plan.id
                  ? "Creating..."
                  : viewerState === "member"
                    ? "Continue to payment"
                    : "Upgrade"
                : action.label;
    
              const card = (
                <Card
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-[2rem] border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                    denseCards && "rounded-[1.4rem]",
                    isFeatured && "border-primary/30 shadow-[0_24px_50px_-24px_rgba(217,75,4,0.45)]",
                  )}
                >
                  <div className={cn(
                    "absolute inset-x-0 top-0 h-1",
                    isFeatured ? "bg-gradient-to-r from-primary/40 via-primary to-primary/40" : "bg-gradient-to-r from-transparent via-primary/25 to-transparent",
                  )} />
                  <CardHeader className={cn(
                    "space-y-4 border-b border-border/20 bg-muted/5 p-5",
                    denseCards && "space-y-2.5 p-3.5",
                  )}>
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <div className="flex items-center justify-self-start">
                        <Badge tone={isFeatured ? "default" : "outline"} className={cn("w-max font-semibold", isFeatured && "bg-primary text-primary-foreground")}>
                          {plan.badgeLabel}
                        </Badge>
                      </div>
                      <CardTitle className="text-center text-lg md:text-xl font-semibold tracking-tight text-foreground">
                        {plan.title}
                      </CardTitle>
                      <div className="flex items-center justify-self-end gap-2">
                        {savings > 0 ? (
                          <Badge tone="secondary" className="bg-emerald-500/10 text-emerald-700">
                            Save {savings}%
                          </Badge>
                        ) : null}
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner",
                          denseCards && "h-9 w-9 rounded-lg",
                          isFeatured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}>
                          {isFeatured ? <PrimePremiumIcon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>
    
                    <div className="space-y-1 text-center">
                      {compareAtPrice > 0 ? (
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-red-500/90 decoration-red-500 line-through">
                          {formatPlanMoney(compareAtPrice, plan.currency)}
                        </p>
                      ) : null}
                      <p className={cn(
                        "text-[1.7rem] md:text-3xl font-semibold tracking-tight text-foreground leading-none",
                        denseCards && "text-[1.2rem] md:text-[1.4rem]",
                      )}>
                        {plan.priceLabel}
                      </p>
                      {savingsAmount > 0 ? (
                        <p className="text-xs font-semibold text-primary">
                          Save {formatPlanMoney(savingsAmount, plan.currency)}
                        </p>
                      ) : null}
                      {plan.monthlyLabel ? (
                        <p className={cn(
                          "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
                          denseCards && "text-[9px]",
                        )}>
                          {plan.monthlyLabel}
                        </p>
                      ) : null}
                    </div>
                  </CardHeader>
    
                  <CardContent className={cn(
                    "flex flex-1 flex-col space-y-5 p-5",
                    denseCards && "space-y-3 p-3.5",
                  )}>
                    <ul className={cn("flex-1 space-y-3", denseCards && "space-y-2")}>
                      {plan.perks.map((perk) => (
                        <li key={perk} className={cn(
                          "flex items-start gap-2.5 text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground",
                          denseCards && "gap-2 text-[11px] md:text-[12px] leading-snug",
                        )}>
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto space-y-3 pt-1">
                      {action.disabled ? (
                        <div className="flex h-12 w-full items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
                          {action.label}
                        </div>
                      ) : isInvoiceAction ? (
                        <Button
                          type="button"
                          disabled={paymentBusyPlanId === plan.id}
                          onClick={() => onChoosePlan?.(plan)}
                          variant={isFeatured ? "default" : "outline"}
                          className={cn(
                            "h-12 w-full rounded-xl text-sm font-medium transition-all",
                            denseCards && "h-10 text-[12px]",
                            !isFeatured && "border-border/60 bg-muted/20 hover:bg-muted/40",
                          )}
                        >
                          {ctaLabel}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          asChild
                          variant={isFeatured ? "default" : "outline"}
                          className={cn(
                            "h-12 w-full rounded-xl text-sm font-medium transition-all",
                            denseCards && "h-10 text-[12px]",
                            !isFeatured && "border-border/60 bg-muted/20 hover:bg-muted/40",
                          )}
                        >
                          <Link
                            href={action.href}
                            onClick={() => {
                              trackPlanSelect({
                                planId: plan.id,
                                planName: plan.title,
                                durationDays: plan.durationDays,
                                value: plan.numericPrice,
                                currency: plan.currency,
                                location: "pricing_plan_grid",
                                authState: viewerState === "guest" ? "guest" : "authenticated",
                              });
                            }}
                          >
                            {action.label}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
    
                      {showPlanNotes ? (
                        <div className="rounded-2xl border border-border/40 bg-background/70 px-3 py-3 text-[10px] md:text-[11px] font-medium leading-relaxed text-muted-foreground/85">
                          {action.note}
                          {" One-time payment, no auto-renew."}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
    
              return (
                <AnimatedItem key={plan.id} index={index} animateInView={animateInView}>
                  {card}
                </AnimatedItem>
              );
            })}
          </div>
          )}
        </div>
      )
  );
}
