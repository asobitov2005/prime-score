"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

interface MarketingAuthCtaProps {
  guestLabel: string;
  authLabel: string;
  guestHref?: string;
  authHref?: string;
  className?: string;
  showArrow?: boolean;
}

export function MarketingAuthCta({
  guestLabel,
  authLabel,
  guestHref = "/login",
  authHref = "/dashboard",
  className,
  showArrow = true,
}: MarketingAuthCtaProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const href = hasHydrated && isAuthenticated ? authHref : guestHref;
  const label = hasHydrated && isAuthenticated ? authLabel : guestLabel;

  return (
    <Button asChild className={cn(className)}>
      <Link href={href}>
        {label}
        {showArrow ? <ArrowRight className="ml-2 h-5 w-5" /> : null}
      </Link>
    </Button>
  );
}
