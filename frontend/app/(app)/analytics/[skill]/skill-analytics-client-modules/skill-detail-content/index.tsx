"use client";
import type { DashboardAnalytics } from "../dependencies";
import { useSkillDetailContentController } from "./controller";
import { SkillDetailContentView } from "./view";

export function SkillDetailContent(props: { variant: "reading" | "listening"; analytics: DashboardAnalytics }) {
  const scope = useSkillDetailContentController(props);
  return <SkillDetailContentView scope={scope} />;
}
