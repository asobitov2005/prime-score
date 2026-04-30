"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { CheckCircle2, Gift, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiError, createApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatPremiumDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface RedeemCodePanelProps {
  buttonClassName?: string;
}

export function RedeemCodePanel({ buttonClassName }: RedeemCodePanelProps) {
  const router = useRouter();
  const api = useMemo(() => createApiClient(), []);
  const { userId, accessToken, isPremium, premiumUntil, syncSession } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const premiumUntilLabel = formatPremiumDate(premiumUntil);
  const isReady = Boolean(userId && accessToken);

  async function handleRedeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = code.trim().replace(/\s+/g, "").toUpperCase();
    if (!normalizedCode || !isReady) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.redeem({ code: normalizedCode });
      syncSession({
        isPremium: response.is_premium,
        premiumUntil: response.premium_until,
      });
      setCode("");
      setSuccessMessage(response.message);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Redeem code could not be applied.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn("h-11 rounded-xl border-border/60 bg-muted/20 px-5 text-sm font-bold hover:bg-muted/40", buttonClassName)}
        onClick={() => setOpen(true)}
      >
        <Gift className="h-4 w-4" />
        Redeem Code
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Redeem Premium Code"
        description="Enter a code from PrimeScore support or an admin to activate premium access or extend your current premium period."
        className="max-w-xl rounded-[1.5rem] border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              <Gift className="h-3 w-3" />
              Gift Code
            </div>
            <Badge tone={isPremium ? "success" : "outline"} className="w-fit">
              {isPremium ? "Premium active" : "Member account"}
            </Badge>
          </div>

          <form className="space-y-4" onSubmit={handleRedeem}>
            <div className="space-y-2">
              <label htmlFor="redeem-code" className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Gift code
              </label>
              <Input
                id="redeem-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  if (errorMessage) {
                    setErrorMessage("");
                  }
                  if (successMessage) {
                    setSuccessMessage("");
                  }
                }}
                placeholder="PRIME-90DAY"
                autoComplete="off"
                spellCheck={false}
                disabled={!isReady || isSubmitting}
                className="h-12 rounded-xl border-border/60 bg-background/70 font-semibold tracking-[0.08em] uppercase"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {premiumUntilLabel
                  ? <>Current premium access runs until <span className="font-semibold text-foreground">{premiumUntilLabel}</span>.</>
                  : "Use a valid redeem code to unlock premium instantly."}
              </p>
              <Button
                type="submit"
                disabled={!isReady || isSubmitting || code.trim().length < 4}
                className="h-12 rounded-xl px-5 text-sm font-black shadow-sm sm:min-w-32"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isSubmitting ? "Applying..." : "Redeem"}
              </Button>
            </div>
          </form>

          {successMessage ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{successMessage}</p>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {!isReady ? (
            <p className="text-sm text-muted-foreground">
              Sign in first to redeem a premium code on your account.
            </p>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
