"use client";
import type { BaseScope } from "./base";
import { useEffect, useRef, useState } from "../dependencies";
import { useCountdown } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { payment, onCopy, onCancel, onClose } = scope;
  const countdown = useCountdown(payment.expiresAt);

  const modalRef = useRef<HTMLDivElement>(null);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const [isCancelling, setIsCancelling] = useState(false);

  const [copyError, setCopyError] = useState<string | null>(null);

  const isExpired = countdown === "Expired";

  const isActivated = payment.status === "completed";

  const isTerminal = isExpired || payment.status === "canceled" || payment.status === "failed";

  const cardValue = payment.cardNumber ?? "-";

  const supportContact = payment.supportContact || "@TheBugCreator";

  const planLabel = payment.durationDays
      ? `${Math.round(payment.durationDays / 30)} MONTH${Math.round(payment.durationDays / 30) === 1 ? "" : "S"}`
      : payment.planName.toUpperCase();

  useEffect(() => {
      modalRef.current?.focus();
    }, []);

  useEffect(() => {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }, []);

  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          if (confirmCancelOpen) {
            setConfirmCancelOpen(false);
            return;
          }
          onClose();
        }
        if (event.key === "Tab") {
          const modal = modalRef.current;
          if (!modal) {
            return;
          }
          const focusable = Array.from(
            modal.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));
          if (focusable.length === 0) {
            event.preventDefault();
            modal.focus();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [confirmCancelOpen, onClose]);

  async function confirmCancel() {
      setIsCancelling(true);
      try {
        await onCancel();
        setConfirmCancelOpen(false);
        onClose();
      } finally {
        setIsCancelling(false);
      }
    }

  async function copyPaymentField(field: "card" | "amount", value: string) {
      setCopyError(null);
      const copied = await onCopy(payment.id, field, value);
      if (!copied) {
        setCopyError("Could not copy. Please copy manually.");
      }
    }

  return { countdown, modalRef, confirmCancelOpen, setConfirmCancelOpen, isCancelling, setIsCancelling, copyError, setCopyError, isExpired, isActivated, isTerminal, cardValue, supportContact, planLabel, confirmCancel, copyPaymentField };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
