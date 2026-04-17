import type { AdminTestDraftState, TestType } from "@/lib/types";

export function createEmptyDraft(type: TestType = "reading"): AdminTestDraftState {
  const sectionLabel = type === "listening" ? "Part 1" : "Passage 1";
  const sectionTitle = type === "listening" ? "Listening Part 1" : "Reading Passage 1";
  const timeLimitLabel = type === "listening" ? "Audio duration + 2 min" : "60 min exam";

  return {
    metadata: {
      title: "",
      type,
      format: "full",
      source: "custom",
      sourceDetail: "",
      accessType: "public",
      status: "draft",
      version: 1,
      timeLimitLabel
    },
    content: {
      sections: [
        {
          id: "section-1",
          label: sectionLabel,
          title: sectionTitle,
          subtitle: "",
          content: "",
          paragraphs: [],
          mediaKind: type === "listening" ? "audio" : "text",
          markerCount: 0
        }
      ]
    },
    questionGroups: [],
    questions: [],
    review: {
      checklist: [],
      notes: []
    },
    decisions: {
      questionBank: {
        label: "Question bank",
        state: "not_supported",
        detail: "Every question is authored directly in each test."
      },
      payment: {
        label: "Payment",
        state: "paused",
        detail: "Payment workflows are controlled separately in revenue modules."
      },
      listeningTimer: {
        label: "Listening timer",
        state: "audio_duration_plus_2_minutes",
        detail: "Listening exam timing follows audio duration plus two minutes."
      }
    }
  };
}
