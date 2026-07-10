"use client";
import type { PaymentsManagerScope } from "./controller";
import { PaymentsManagerView1 } from "./view-section-07";

export function PaymentsManagerView({ scope }: { scope: PaymentsManagerScope }) {
  return <PaymentsManagerView1 scope={scope} />;
}
