"use client";
import type { TopicFormModalScope } from "./controller";
import { TopicFormModalView1 } from "./view-section-01";

export function TopicFormModalView({ scope }: { scope: TopicFormModalScope }) {
  return <TopicFormModalView1 scope={scope} />;
}
