"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";

interface PremiumUpgradeModalProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  subscriptionHref: string;
  onClose: () => void;
}

export function PremiumUpgradeModal({
  title = "Premium Content",
  description = "Unlock this test and get access to detailed analytics and premium study materials.",
  actionLabel = "Upgrade to Premium",
  subscriptionHref,
  onClose,
}: PremiumUpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-[1.5rem] border border-amber-500/30 bg-card/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in zoom-in-95 duration-300" onClick={(event) => event.stopPropagation()}>
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          aria-label="Close premium modal"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5 p-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <PrimePremiumIcon className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
            <p className="mx-auto max-w-[260px] text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Button asChild className="h-10 w-full rounded-xl bg-amber-500 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95 dark:text-slate-950">
              <Link href={subscriptionHref}>
                <PrimePremiumIcon className="mr-1.5 h-3.5 w-3.5" />
                {actionLabel}
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-10 w-full rounded-xl text-xs font-semibold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
