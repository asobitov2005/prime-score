"use client";
import type { PaymentManagerProps } from "../shared";

export function useBaseScope(props: PaymentManagerProps) {
  const { initialPayments, totalPayments, currentPage, initialCards, initialSettings } = props;
    return { initialPayments, totalPayments, currentPage, initialCards, initialSettings };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
