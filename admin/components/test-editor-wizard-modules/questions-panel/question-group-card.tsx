"use client";
import type { QuestionsPanelScope } from "./controller";
import type { QuestionGroupItem } from "./question-group-item";
import { QuestionGroupSection1 } from "./question-group-section-11.tsx";

export function QuestionGroupCard({ scope, item }: { scope: QuestionsPanelScope; item: QuestionGroupItem }) {
  return <QuestionGroupSection1 scope={scope} item={item} />;
}
