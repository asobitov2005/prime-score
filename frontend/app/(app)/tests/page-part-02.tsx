import { ListeningFormat, ReadingFormat } from "./page-part-01";

export const listeningCollectionCards = [
  {
    title: "All Collections",
    subtitle: "13 tests",
    source: "all",
    imageSrc: "/images/all collections.jpg",
    imageAlt: "All listening collections cover",
  },
  {
    title: "Cambridge Official",
    subtitle: "Official tests",
    source: "cambridge",
    imageSrc: "/images/cambridge.jpg",
    imageAlt: "Cambridge IELTS listening cover",
  },
  {
    title: "Recent Exam Papers",
    subtitle: "Latest audio tests",
    source: "real_exam",
    imageSrc: "/images/recent exam pepers.jpg",
    imageAlt: "Recent listening papers collection cover",
  },
  {
    title: "Exam Practice Tests",
    subtitle: "Part practice",
    source: "custom",
    imageSrc: "/images/exam practice tests.jpg",
    imageAlt: "Listening practice tests collection cover",
  },
] as const;

export const readingTabs = [
  { label: "All", value: "all" },
  { label: "Full Tests", value: "full" },
  { label: "Passage 1", value: "passage_1" },
  { label: "Passage 2", value: "passage_2" },
  { label: "Passage 3", value: "passage_3" },
] as const;

export const listeningTabs = [
  { label: "All", value: "all" },
  { label: "Full Tests", value: "full" },
  { label: "Part 1", value: "part_1" },
  { label: "Part 2", value: "part_2" },
  { label: "Part 3", value: "part_3" },
  { label: "Part 4", value: "part_4" },
] as const;

export function getReadingTabLabel(value: ReadingFormat) {
  switch (value) {
    case "all":
      return "All";
    case "full":
      return "Full Tests";
    case "passage_1":
      return "Passage 1";
    case "passage_2":
      return "Passage 2";
    case "passage_3":
      return "Passage 3";
  }
}

export function getListeningTabLabel(value: ListeningFormat) {
  switch (value) {
    case "all":
      return "All";
    case "full":
      return "Full Tests";
    case "part_1":
      return "Part 1";
    case "part_2":
      return "Part 2";
    case "part_3":
      return "Part 3";
    case "part_4":
      return "Part 4";
  }
}

export function getCollectionTitle(title: string) {
  switch (title) {
    case "All Collections":
      return "All Collections";
    case "Cambridge Official":
      return "Cambridge Official";
    case "Recent Exam Papers":
      return "Recent Exam Papers";
    case "Exam Practice Tests":
      return "Exam Practice Tests";
    default:
      return title;
  }
}

export function getSummaryTitle(title: string) {
  switch (title) {
    case "All Tests":
      return "All Tests";
    case "Reading Tests":
      return "Reading Tests";
    case "Listening Tests":
      return "Listening Tests";
    case "Premium Tests":
      return "Premium Tests";
    case "Feedback & Analytics":
      return "Feedback & Analytics";
    default:
      return title;
  }
}

export function getSkillCardDescription(title: string, fallback: string) {
  switch (title) {
    case "Reading":
      return "Full tests and passage practice";
    case "Listening":
      return "Full tests and part-based practice";
    case "Writing":
      return "Get AI Feedback on your Writing";
    case "Speaking":
      return "Practice Speaking with AI Examiner";
    default:
      return fallback;
  }
}

export function getSkillCardButton(label: string) {
  switch (label) {
    case "Open Reading":
      return "Open Reading";
    case "Open Listening":
      return "Open Listening";
    case "Open Writing":
      return "Open Writing";
    case "Open Speaking":
      return "Open Speaking";
    case "Open Full Mock":
      return "Open Full IELTS Mock";
    default:
      return label;
  }
}
