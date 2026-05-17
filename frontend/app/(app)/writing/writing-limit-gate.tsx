"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { Button, type ButtonProps } from "@/components/ui/button";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import type { WritingLimitStatus } from "@/lib/server-writing";
import { useAuthStore } from "@/store/auth-store";

interface GateProps {
  limitStatus: WritingLimitStatus | null;
}

interface WritingLimitLinkProps extends GateProps {
  href: string;
  className?: string;
  children: ReactNode;
}

interface WritingLimitButtonProps extends GateProps, Omit<ButtonProps, "onClick" | "asChild"> {
  href: string;
  children: ReactNode;
}

interface WritingLimitTriggerProps extends GateProps {
  className?: string;
  children: ReactNode;
  onAllowedClick: () => void;
}

function canOpenWriting(limitStatus: WritingLimitStatus | null): boolean {
  return !limitStatus || limitStatus.can_submit;
}

function buildModalCopy(limitStatus: WritingLimitStatus | null) {
  if (limitStatus?.is_premium) {
    const total = limitStatus.daily_limit ?? 0;
    return {
      title: "Daily Writing limit reached",
      description: `You used ${limitStatus.used_today}/${total} Writing checks today. Upgrade your plan to raise the limit, or come back after the daily reset.`,
      actionLabel: "Upgrade plan",
    };
  }
  return {
    title: "Premium Writing",
    description: "IELTS Writing feedback is available for Premium members. Upgrade to unlock Writing checks and detailed sentence-level feedback.",
    actionLabel: "Upgrade to Premium",
  };
}

function usePremiumModal(limitStatus: WritingLimitStatus | null) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);
  const copy = useMemo(() => buildModalCopy(limitStatus), [limitStatus]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modal = mounted && open
    ? createPortal(
        <PremiumUpgradeModal
          title={copy.title}
          description={copy.description}
          actionLabel={copy.actionLabel}
          subscriptionHref={subscriptionHref}
          onClose={() => setOpen(false)}
        />,
        document.body,
      )
    : null;

  return { setOpen, modal };
}

export function WritingLimitLink({ limitStatus, href, className, children }: WritingLimitLinkProps) {
  const allowed = canOpenWriting(limitStatus);
  const { setOpen, modal } = usePremiumModal(limitStatus);

  if (allowed) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {modal}
    </>
  );
}

export function WritingLimitButton({ limitStatus, href, children, ...props }: WritingLimitButtonProps) {
  const allowed = canOpenWriting(limitStatus);
  const { setOpen, modal } = usePremiumModal(limitStatus);

  return (
    <>
      {allowed ? (
        <Button {...props} asChild>
          <Link href={href}>{children}</Link>
        </Button>
      ) : (
        <Button {...props} onClick={() => setOpen(true)}>
          {children}
        </Button>
      )}
      {modal}
    </>
  );
}

export function WritingLimitTrigger({ limitStatus, className, children, onAllowedClick }: WritingLimitTriggerProps) {
  const allowed = canOpenWriting(limitStatus);
  const { setOpen, modal } = usePremiumModal(limitStatus);

  return (
    <>
      <button type="button" onClick={allowed ? onAllowedClick : () => setOpen(true)} className={className}>
        {children}
      </button>
      {modal}
    </>
  );
}
