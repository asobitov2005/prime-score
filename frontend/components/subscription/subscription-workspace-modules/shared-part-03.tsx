"use client";

import { ApiError, Button, Check, ChevronRight, Copy, CreditCard, Crown, FormEvent, Gift, Info, Input, Loader2, Send, ShoppingCart, cn, createApiClient, useAuthStore, useMemo, useRouter, useState } from "./dependencies";



export function ActivationStepsSection() {
  const steps = [
    {
      Icon: ShoppingCart,
      title: "Choose a plan",
      text: "Select the plan that fits you best.",
      tone: "blue",
    },
    {
      Icon: CreditCard,
      title: "Make a payment",
      text: "Send the payment to our official details.",
      tone: "blue",
    },
    {
      Icon: Send,
      title: "Send receipt",
      text: "Send screenshot to Telegram support.",
      tone: "blue",
    },
    {
      Icon: Crown,
      title: "Get activated",
      text: "We activate your premium as soon as possible.",
      tone: "green",
    },
  ];

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">How activation works</h2>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-start">
        {steps.map((step, index) => (
          <div key={step.title} className="contents">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border text-center shadow-sm",
                  step.tone === "green"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
                )}
              >
                <step.Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-1 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">{step.text}</p>
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div className="hidden pt-4 text-slate-300 dark:text-slate-700 xl:block">
                <ChevronRight className="h-5 w-5" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
        <a
          href="https://t.me/PrimeScoreSupport"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2.5 text-sm font-semibold text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
        >
          <svg className="h-5 w-5" viewBox="0 0 240 240" aria-hidden="true" fill="currentColor">
            <path d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0Zm55.7 82.3-19.7 92.8c-1.5 6.6-5.4 8.2-10.9 5.1l-30.2-22.3-14.6 14c-1.6 1.6-3 3-6.1 3l2.2-30.8 56.1-50.7c2.4-2.2-.5-3.4-3.8-1.2l-69.3 43.6-29.8-9.3c-6.5-2-6.6-6.5 1.4-9.6l116.5-44.9c5.4-2 10.1 1.3 8.2 10.3Z" />
          </svg>
          Telegram support: @PrimeScoreSupport
        </a>
      </div>
    </section>
  );
}

export function PremiumCodeSection() {
  const router = useRouter();
  const api = useMemo(() => createApiClient(), []);
  const { userId, accessToken, syncSession } = useAuthStore();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const isReady = Boolean(userId && accessToken);
  const normalizedCodeLength = code.trim().replace(/\s+/g, "").length;

  async function handleRedeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim().replace(/\s+/g, "").toUpperCase();
    if (!normalizedCode || !isReady) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await api.redeem({ code: normalizedCode });
      syncSession({
        isPremium: response.is_premium,
        premiumUntil: response.premium_until,
      });
      setCode("");
      setMessage({ type: "success", text: response.message });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof ApiError ? error.message : "Redeem code could not be applied." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
            <Gift className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">Have a premium code?</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Enter your code to activate premium instantly.</p>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                if (message) setMessage(null);
              }}
              placeholder="Enter code"
              autoComplete="off"
              spellCheck={false}
              disabled={!isReady || isSubmitting}
              className="h-12 rounded-xl border-slate-200 bg-slate-50/70 font-semibold uppercase tracking-[0.08em] dark:border-slate-800 dark:bg-slate-950/35"
            />
            <Button
              type="submit"
              disabled={!isReady || isSubmitting || normalizedCodeLength < 7}
              className="h-12 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white shadow-[0_16px_34px_-20px_rgba(249,115,22,0.9)] hover:bg-orange-600"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Redeeming..." : "Redeem Code"}
            </Button>
          </div>

          <div className="flex items-start gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <p>Each code works once and cannot be used on your own account.</p>
          </div>
        </form>
      </div>

      {message ? (
        <div
          className={cn(
            "mt-4 rounded-xl border px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200",
          )}
        >
          {message.text}
        </div>
      ) : null}
    </section>
  );
}

export function CopyActionButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      onClick={onClick}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
