"use client";
import type { PaymentsManagerScope } from "./controller";
import { Notice } from "../dependencies";

export function PaymentsManagerSection4({ scope }: { scope: PaymentsManagerScope }) {
  const { settings } = scope;
  return (
    <Notice
            tone="success"
            title="Manual payment flow"
            description={`Users transfer the exact plan amount to the active card, then send a screenshot to ${settings?.supportContact ?? "@TheBugCreator"} on Telegram.`}
          />
  );
}
