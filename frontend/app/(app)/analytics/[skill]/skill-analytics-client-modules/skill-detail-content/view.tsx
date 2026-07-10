"use client";
import type { SkillDetailContentScope } from "./controller";
import { SkillDetailContentView1 } from "./view-section-01";

export function SkillDetailContentView({ scope }: { scope: SkillDetailContentScope }) {
  return <SkillDetailContentView1 scope={scope} />;
}
