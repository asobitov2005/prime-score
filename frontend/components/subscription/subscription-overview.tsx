"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import type { MarketingPlan } from "@/lib/server-plans";
import styles from "./subscription.module.css";

export function SubscriptionOverview({ plans, busyPlanId, onChoosePlan, isPremium, premiumUntil }: {
  plans: MarketingPlan[];
  busyPlanId: string | null;
  onChoosePlan: (plan: MarketingPlan) => void;
  isPremium: boolean;
  premiumUntil: string | null;
}) {
  const expiry = premiumUntil ? new Date(premiumUntil) : null;
  const expiryLabel = expiry && Number.isFinite(expiry.getTime())
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(expiry)
    : null;

  return (
    <>
      <header className={styles.header}>
        <p className={styles.eyebrow}>YOUR MEMBERSHIP</p>
        <h1>More practice. Clearer progress.</h1>
        <p>Choose how long you want to prepare. We&apos;ll take care of the rest.</p>
      </header>

      <section className={styles.current} aria-label="Current subscription">
        <div>
          <p className={styles.label}>Current plan</p>
          <div className={styles.currentTitle}>
            <h2>{isPremium ? "Premium" : "Free plan"}</h2>
            {isPremium ? <span className={styles.status}><Check size={13} aria-hidden /> Active</span> : null}
          </div>
        </div>
        <p className={styles.currentDetail}>
          {isPremium
            ? expiryLabel ? <>Active until <strong>{expiryLabel}</strong></> : "Your Premium access is active."
            : "Upgrade whenever you're ready."}
        </p>
        <a href="#premium-plans" className={styles.textLink}>
          {isPremium ? "Extend access" : "Explore plans"}<ArrowRight size={15} aria-hidden />
        </a>
      </section>

      <section id="premium-plans" className={styles.plans} aria-labelledby="plans-heading">
        <div className={styles.sectionHeading}>
          <h2 id="plans-heading">Choose your time to prepare</h2>
          <p>One payment. No automatic renewal.</p>
        </div>
        <div className={styles.planGrid}>
          {plans.map((plan) => (
            <article key={plan.id} className={styles.plan}>
              <div className={styles.planHeading}>
                <h3>{plan.title}</h3>
                <span>{plan.durationDays} days of access</span>
              </div>
              <div className={styles.price}>
                <strong>{plan.priceLabel}</strong>
                <span>{plan.monthlyLabel || "One-time payment"}</span>
              </div>
              <button
                type="button"
                className={styles.payButton}
                disabled={busyPlanId !== null}
                aria-busy={busyPlanId === plan.id}
                aria-label={`Pay with Click for ${plan.title}`}
                onClick={() => onChoosePlan(plan)}
              >
                {busyPlanId === plan.id ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Creating invoice...</> : <>Pay with Click <ArrowRight size={16} aria-hidden /></>}
              </button>
              {plan.perks.length > 0 ? (
                <ul className={styles.perks}>
                  {plan.perks.map((perk, index) => <li key={`${index}-${perk}`}><Check size={15} aria-hidden /><span>{perk}</span></li>)}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
        {plans.length === 0 ? <div className={styles.empty}><h3>Plans are temporarily unavailable</h3><p>Please try again later. Your existing access is unchanged.</p></div> : null}
        <div className={styles.included}>
          <h3>Included with every plan</h3>
          <ul>
            {["Premium Reading & Listening", "AI Writing feedback", "Answer explanations", "Progress & analytics"].map((feature) => <li key={feature}><Check size={15} aria-hidden />{feature}</li>)}
          </ul>
        </div>
      </section>
    </>
  );
}

export function SubscriptionPaymentGuide() {
  return (
    <section className={styles.paymentGuide} aria-label="How payment works">
      <ol>
        <li><span>01</span><div><strong>Choose a plan</strong><p>Pick your preparation period.</p></div></li>
        <li><span>02</span><div><strong>Pay with Click</strong><p>Complete your payment securely in Click.</p></div></li>
        <li><span>03</span><div><strong>Start practising</strong><p>Premium activates automatically after Click confirms payment. No screenshot is needed.</p></div></li>
      </ol>
      <a href="https://t.me/TheBugCreator" target="_blank" rel="noreferrer" className={styles.support}>Payment or activation problem? Contact @TheBugCreator <ArrowRight size={14} aria-hidden /></a>
    </section>
  );
}
