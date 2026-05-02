"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { getFrontendClientApiBaseUrl } from "@/lib/api-base";

export type PaymentSSEEvent =
  | { type: "connected" }
  | { type: "payment_matched"; paymentId: string; invoiceCode: string; status: string }
  | { type: "payment_completed"; paymentId: string; invoiceCode: string; status: string; planName: string; grantedUntil: string }
  | { type: "payment_expired"; paymentId: string; invoiceCode: string; status: string };

type PaymentSSEOptions = {
  onEvent: (event: PaymentSSEEvent) => void;
  enabled?: boolean;
};

/**
 * Hook that opens an SSE connection to /me/payments/stream
 * and fires callbacks for real-time payment status changes.
 *
 * Auto-reconnects on disconnect with exponential backoff.
 */
export function usePaymentSSE({ onEvent, enabled = true }: PaymentSSEOptions) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);

  const cleanup = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    if (!enabled || !accessToken) {
      return;
    }

    // EventSource doesn't support Authorization header,
    // so we pass token as query param. Backend must handle both.
    const baseUrl = getFrontendClientApiBaseUrl();
    const url = `${baseUrl}/me/payments/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(url);
    sourceRef.current = eventSource;

    const handleEvent = (eventType: string) => (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data || "{}");
        const mapped: PaymentSSEEvent = {
          type: eventType as PaymentSSEEvent["type"],
          ...data,
          paymentId: data.payment_id,
          invoiceCode: data.invoice_code,
          planName: data.plan_name,
          grantedUntil: data.granted_until,
        };
        onEventRef.current(mapped);
      } catch {
        // Ignore malformed events
      }
    };

    eventSource.addEventListener("connected", () => {
      backoffRef.current = 1000; // Reset backoff on successful connection
      onEventRef.current({ type: "connected" });
    });
    eventSource.addEventListener("payment_matched", handleEvent("payment_matched"));
    eventSource.addEventListener("payment_completed", handleEvent("payment_completed"));
    eventSource.addEventListener("payment_expired", handleEvent("payment_expired"));

    eventSource.onerror = () => {
      eventSource.close();
      sourceRef.current = null;
      // Exponential backoff reconnection
      reconnectRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, 30000);
        connect();
      }, backoffRef.current);
    };
  }, [enabled, accessToken, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);
}
