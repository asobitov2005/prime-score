"use client";
import type { PaymentsManagerScope } from "./controller";
import { Notice } from "../dependencies";

export function PaymentsManagerSection3({ scope }: { scope: PaymentsManagerScope }) {
  const { notice } = scope;
  return (
    {notice ? <Notice tone={notice.tone} title={notice.title} description={notice.description} /> : null}
  );
}
