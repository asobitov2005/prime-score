"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { ArrowRight, Badge, Button, Card, CardContent, CardHeader, CardTitle, CheckCircle2, Link, PrimePremiumIcon, RedeemCodePanel, Sparkles, cn, trackPlanSelect } from "../dependencies";
import { AnimatedItem, PricingStateCard, calculateSavingsAmount, calculateSavingsPercent, formatPlanMoney, getPlanAction } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { plans, compact, showStateCard, showPlanNotes, denseCards, mode, showSubscriptionHeader, animateInView, onChoosePlan, paymentBusyPlanId, viewerState, subscriptionHref, stateCopy, baselinePlan, planGridClassName, activePlanId, emptyState } = scope;
  if (mode === "subscription") {
      return (
        <div className="space-y-4">
          {showStateCard ? (
            <AnimatedItem animateInView={animateInView}>
              <PricingStateCard compact={compact} stateCopy={stateCopy} />
            </AnimatedItem>
          ) : null}
  
          {showSubscriptionHeader ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge tone="secondary" className="w-max bg-primary/10 text-primary">
                  Premium plans
                </Badge>
                <CardTitle className="text-2xl font-semibold tracking-tight">Choose a Premium plan.</CardTitle>
              </div>
  
              <RedeemCodePanel />
            </div>
          ) : null}
  
          {plans.length === 0 ? emptyState : (
          <div className={cn("grid gap-4", planGridClassName)}>
            {plans.map((plan, index) => {
              const isFeatured = plan.isFeatured;
              const isCurrentPlan = activePlanId === plan.id;
              const action = getPlanAction(viewerState, isCurrentPlan, subscriptionHref);
              const savings = calculateSavingsPercent(plan, baselinePlan);
              const savingsAmount = calculateSavingsAmount(plan, baselinePlan);
              const compareAtPrice = savingsAmount > 0 ? plan.numericPrice + savingsAmount : 0;
              const isInvoiceAction = mode === "subscription" && Boolean(onChoosePlan) && viewerState !== "guest" && !action.disabled;
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
                    denseCards && "space-y-1.5 p-3",
                  )}>
                    {denseCards ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={isFeatured ? "default" : "outline"} className={cn(
                            "shrink-0 font-semibold px-2 py-0.5 text-[9px] tracking-[0.12em]",
                            isFeatured && "bg-primary text-primary-foreground",
                          )}>
                            {plan.badgeLabel}
                          </Badge>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {savings > 0 ? (
                              <Badge tone="secondary" className="bg-emerald-500/10 px-2 py-0.5 text-[9px] tracking-[0.12em] text-emerald-700">
                                Save {savings}%
                              </Badge>
                            ) : null}
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg shadow-inner",
                              isFeatured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                            )}>
                              {isFeatured ? <PrimePremiumIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>
                        <CardTitle className="min-h-[1.25rem] text-center text-sm font-semibold tracking-tight text-foreground leading-tight md:text-[15px]">
                          {plan.title}
                        </CardTitle>
                      </>
                    ) : (
                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                        <div className="flex justify-self-start">
                          <Badge tone={isFeatured ? "default" : "outline"} className={cn(
                            "shrink-0 font-semibold",
                            isFeatured && "bg-primary text-primary-foreground",
                          )}>
                            {plan.badgeLabel}
                          </Badge>
                        </div>
                        <CardTitle className="text-center text-lg md:text-xl font-semibold tracking-tight text-foreground leading-tight">
                          {plan.title}
                        </CardTitle>
                        <div className="flex shrink-0 items-center justify-self-end gap-2">
                          {savings > 0 ? (
                            <Badge tone="secondary" className="bg-emerald-500/10 text-emerald-700">
                              Save {savings}%
                            </Badge>
                          ) : null}
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner",
                            isFeatured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                          )}>
                            {isFeatured ? <PrimePremiumIcon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className={cn("space-y-1 text-center", denseCards && "min-h-[4.75rem]")}>
                      <p className={cn(
                        "text-[11px] font-medium uppercase tracking-[0.14em] text-red-500/90 decoration-red-500 line-through",
                        denseCards && "min-h-[0.9rem] text-[11px] tracking-[0.1em]",
                        compareAtPrice <= 0 && "invisible",
                      )}>
                        {compareAtPrice > 0 ? formatPlanMoney(compareAtPrice, plan.currency) : plan.priceLabel}
                      </p>
                      <p className={cn(
                        "font-semibold tracking-tight text-foreground leading-none",
                        denseCards ? "text-[1.12rem] md:text-[1.24rem]" : "text-[1.7rem] md:text-3xl",
                      )}>
                        {plan.priceLabel}
                      </p>
                      <p className={cn(
                        "text-xs font-semibold text-primary",
                        denseCards && "min-h-[0.9rem] text-[11px]",
                        savingsAmount <= 0 && "invisible",
                      )}>
                        {savingsAmount > 0 ? `Save ${formatPlanMoney(savingsAmount, plan.currency)}` : plan.priceLabel}
                      </p>
                      <p className={cn(
                        "text-xs md:text-sm font-semibold tracking-[0.08em] text-muted-foreground leading-relaxed",
                        denseCards && "min-h-[0.75rem] text-[9px] md:text-[10px] tracking-[0.06em]",
                        !plan.monthlyLabel && "invisible",
                      )}>
                        {plan.monthlyLabel || plan.priceLabel}
                      </p>
                    </div>
                  </CardHeader>
  
                  <CardContent className={cn(
                    "flex flex-1 flex-col space-y-5 p-5",
                    denseCards && "space-y-2.5 p-3",
                  )}>
                    <ul className={cn("flex-1 space-y-3", denseCards && "space-y-1.5")}>
                      {plan.perks.map((perk) => (
                        <li key={perk} className={cn(
                          "flex items-start gap-2.5 text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground",
                          denseCards && "gap-1.5 text-[12px] md:text-[13px] leading-[1.3]",
                        )}>
                          <span className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
                            denseCards && "h-4 w-4",
                          )}>
                            <CheckCircle2 className={cn("h-3.5 w-3.5", denseCards && "h-3 w-3")} />
                          </span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto space-y-2 pt-1">
                      {action.disabled ? (
                        <div className={cn(
                          "flex h-12 w-full items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary",
                          denseCards && "h-9 text-[11px]",
                        )}>
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
                            denseCards && "h-9 text-[11px]",
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
                            "h-12 w-full rounded-xl text-sm transition-all",
                            compact ? "font-semibold" : "font-black",
                            denseCards && "h-9 text-[11px]",
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
                                location: mode === "subscription" ? "subscription_plan_grid" : "pricing_plan_grid",
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
      );
    }

  return {  };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
