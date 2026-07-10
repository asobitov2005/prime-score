"use client";
import type { UserPaymentRecord } from "../dependencies";
import { useActiveInvoiceModalController } from "./controller";
import { ActiveInvoiceModalView } from "./view";

export function ActiveInvoiceModal(props: {
  payment: UserPaymentRecord;
  copiedField: string | null;
  onCopy: (paymentId: string, field: "card" | "amount", value: string) => Promise<boolean>;
  onCancel: () => Promise<void>;
  onClose: () => void;
}) {
  const scope = useActiveInvoiceModalController(props);
  return <ActiveInvoiceModalView scope={scope} />;
}
