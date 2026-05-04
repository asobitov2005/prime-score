import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";
import { Suspense } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Suspense fallback={children}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
