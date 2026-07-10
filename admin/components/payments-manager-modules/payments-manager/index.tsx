"use client";
import type { PaymentManagerProps } from "../shared";
import { usePaymentsManagerController } from "./controller";
import { PaymentsManagerView } from "./view";

export function PaymentsManager(props: PaymentManagerProps) {
  const scope = usePaymentsManagerController(props);
  return <PaymentsManagerView scope={scope} />;
}
