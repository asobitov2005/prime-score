"use client";
import type { PlanManagerScope } from "./controller";
import { Notice } from "../dependencies";

export function PlanManagerSection3({ scope }: { scope: PlanManagerScope }) {
  const { notice } = scope;
  return (
    {notice ? (
            <Notice
              tone={notice.tone}
              title={notice.tone === "success" ? "Saved" : "Check required fields"}
              description={notice.text}
            />
          ) : null}
  );
}
