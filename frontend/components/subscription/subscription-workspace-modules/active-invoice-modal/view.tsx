"use client";
import type { ActiveInvoiceModalScope } from "./controller";
import { ActiveInvoiceModalView1 } from "./view-section-01";

export function ActiveInvoiceModalView({ scope }: { scope: ActiveInvoiceModalScope }) {
  return <ActiveInvoiceModalView1 scope={scope} />;
}
