import { SiteShell } from "@/components/layout/site-shell";
import type { ReactNode } from "react";

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return <SiteShell>{children}</SiteShell>;
}
