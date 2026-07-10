"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useActiveInvoiceModalController(props: {
  payment: UserPaymentRecord;
  copiedField: string | null;
  onCopy: (paymentId: string, field: "card" | "amount", value: string) => Promise<boolean>;
  onCancel: () => Promise<void>;
  onClose: () => void;
}) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type ActiveInvoiceModalScope = ReturnType<typeof useActiveInvoiceModalController>;
