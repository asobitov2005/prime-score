"use client";
import type { UserPaymentRecord } from "../dependencies";

export function useBaseScope(props: {
  payment: UserPaymentRecord;
  copiedField: string | null;
  onCopy: (paymentId: string, field: "card" | "amount", value: string) => Promise<boolean>;
  onCancel: () => Promise<void>;
  onClose: () => void;
}) {
  const {
    payment,
    copiedField,
    onCopy,
    onCancel,
    onClose,
  } = props;
    return { payment, copiedField, onCopy, onCancel, onClose };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
