"use client";
import type { PricingPlanGridProps } from "../shared";

export function useBaseScope(props: PricingPlanGridProps) {
  const {
    plans,
    compact = false,
    showStateCard = true,
    showPlanNotes = false,
    denseCards = false,
    mode = "grid",
    showSubscriptionHeader = true,
    animateInView = false,
    onChoosePlan,
    paymentBusyPlanId = null,
  } = props;
    return { plans, compact, showStateCard, showPlanNotes, denseCards, mode, showSubscriptionHeader, animateInView, onChoosePlan, paymentBusyPlanId };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
