"use client";
import { useQuestionsPanelController } from "./controller";
import { QuestionsPanelView } from "./view";

export function QuestionsPanel(props: Parameters<typeof useQuestionsPanelController>[0]) {
  const scope = useQuestionsPanelController(props);
  return <QuestionsPanelView scope={scope} />;
}
