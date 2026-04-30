import type {
  ListeningPart,
  ListeningSegment,
  ReadingPassage,
  TestQuestion,
  TestQuestionOption,
  TestSectionSummary
} from "@/lib/types";

type SnapshotQuestion = {
  question_id: string;
  question_number: number;
  section_id: string;
  section_title: string;
  group_id: string;
  group_title: string;
  question_type: TestQuestion["type"];
  prompt: string;
  instructions: string;
  label?: string | null;
  options?: Array<string | { id?: string; label?: string }>;
  selection_limit?: number | null;
  word_limit?: number | null;
};

type SnapshotQuestionGroup = {
  group_id: string;
  group_title: string;
  question_type: TestQuestion["type"];
  question_start: number;
  question_end: number;
  shared_content?: {
    diagram_title?: string;
    diagram_image_url?: string;
  };
  questions: SnapshotQuestion[];
};

type SnapshotSection = {
  section_id: string;
  section_number: number;
  label?: string | null;
  title?: string | null;
  subtitle?: string | null;
  intro?: string | null;
  content?: string | null;
  question_count: number;
  audio_duration_seconds?: number | null;
  question_groups?: SnapshotQuestionGroup[];
};

type AttemptSnapshot = {
  sections?: SnapshotSection[];
  questions?: SnapshotQuestion[];
};

function mapOptions(options: SnapshotQuestion["options"]): TestQuestionOption[] | undefined {
  if (!options || options.length === 0) {
    return undefined;
  }
  return options.map((option, index) => {
    if (typeof option === "string") {
      return {
        id: option,
        label: option
      };
    }
    return {
      id: option.id ?? `option-${index + 1}`,
      label: option.label ?? option.id ?? `Option ${index + 1}`
    };
  });
}

function mapQuestions(questions: SnapshotQuestion[]): TestQuestion[] {
  return questions.map((question) => ({
    id: question.question_id,
    number: question.question_number,
    label: question.label ?? undefined,
    type: question.question_type,
    prompt: question.prompt,
    instructions: question.instructions,
    options: mapOptions(question.options),
    answerSlots: question.word_limit ?? undefined,
    selectionLimit: question.selection_limit ?? undefined,
    sectionId: question.section_id,
    sectionTitle: question.section_title,
    groupId: question.group_id,
    groupTitle: question.group_title
  }));
}

export function mapSnapshotSections(snapshot: AttemptSnapshot): TestSectionSummary[] {
  return (snapshot.sections ?? []).map((section) => ({
    id: section.section_id,
    number: section.section_number,
    title: section.title ?? `Section ${section.section_number}`,
    questionCount: section.question_count,
    teaser: section.subtitle ?? section.intro ?? "Structured section"
  }));
}

export function buildReadingPassageFromSnapshot(snapshot: AttemptSnapshot, sectionId: string): ReadingPassage | null {
  const section = (snapshot.sections ?? []).find((item) => item.section_id === sectionId);
  if (!section) {
    return null;
  }

  const questionGroups = (section.question_groups ?? []).map((group) => ({
    id: group.group_id,
    title: group.group_title,
    type: group.question_type,
    questionStart: group.question_start,
    questionEnd: group.question_end,
    diagramTitle: group.shared_content?.diagram_title ?? undefined,
    diagramImageUrl: group.shared_content?.diagram_image_url ?? undefined,
    questions: mapQuestions(group.questions)
  }));
  const questions = questionGroups.flatMap((group) => group.questions);
  const content = section.content ?? section.intro ?? `${section.title ?? "Passage"} content will be rendered from the structured snapshot.`;

  return {
    id: section.section_id,
    title: section.title ?? `Passage ${section.section_number}`,
    subtitle: section.subtitle ?? section.intro ?? "Structured reading section",
    content,
    paragraphs: content.split(/\n{2,}/).filter(Boolean),
    questions,
    questionGroups
  };
}

export function buildListeningPartFromSnapshot(snapshot: AttemptSnapshot, sectionId: string): ListeningPart | null {
  const section = (snapshot.sections ?? []).find((item) => item.section_id === sectionId);
  if (!section) {
    return null;
  }

  const questionGroups = (section.question_groups ?? []).map((group) => ({
    id: group.group_id,
    title: group.group_title,
    type: group.question_type,
    questionStart: group.question_start,
    questionEnd: group.question_end,
    diagramTitle: group.shared_content?.diagram_title ?? undefined,
    diagramImageUrl: group.shared_content?.diagram_image_url ?? undefined,
    questions: mapQuestions(group.questions)
  }));
  const questions = questionGroups.flatMap((group) => group.questions);
  const duration = section.audio_duration_seconds ?? 0;
  const segments: ListeningSegment[] = [
    {
      id: `${section.section_id}-segment-1`,
      label: section.label ?? `Part ${section.section_number}`,
      startSecond: 0,
      endSecond: duration
    }
  ];

  return {
    id: section.section_id,
    title: section.title ?? `Part ${section.section_number}`,
    subtitle: section.subtitle ?? section.intro ?? "Structured listening section",
    transcriptSummary: section.content ?? section.intro ?? "Listening transcript summary is attached to the snapshot.",
    segments,
    questions,
    questionGroups,
    audioDurationSeconds: duration
  };
}
