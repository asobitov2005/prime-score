import Link from "next/link";
import Image from "next/image";
import type { ComponentType } from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  ClipboardCheck,
  Crown,
  FileText,
  Folder,
  Headphones,
  Mic,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCatalogTests } from "@/lib/server-data";
import { getUserAttempts } from "@/lib/server-me";
import { getTestSourceKey, getTestSourceLabel } from "@/lib/test-source";
import type { AttemptRow, TestCardAttemptSummary, TestCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LatestTestsPanel } from "./latest-tests-panel";
import { PracticeCatalogView } from "./practice-catalog-view";
import { TestsRefreshOnMount } from "./refresh-on-mount";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ActiveType = "all" | "reading" | "listening";
type ReadingSource = "all" | "cambridge" | "real_exam" | "custom";
type ReadingFormat = "all" | "full" | "passage_1" | "passage_2" | "passage_3";
type ListeningFormat = "all" | "full" | "part_1" | "part_2" | "part_3" | "part_4";
type ReadingAccess = "all" | "free" | "premium";
type ReadingSort = "newest" | "oldest" | "title_az" | "not_attempted";

interface TestsPageProps {
  searchParams?: {
    type?: string;
    q?: string;
    source?: string;
    format?: string;
    access?: string;
    sort?: string;
  };
}

const summaryCards = [
  {
    title: "All Tests",
    value: "120+",
    icon: Folder,
    tileClassName: "border-orange-100 bg-orange-50 text-orange-600 shadow-orange-100/70 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300 dark:shadow-none",
  },
  {
    title: "Reading Tests",
    value: "77",
    icon: BookOpen,
    tileClassName: "border-emerald-100 bg-emerald-50 text-emerald-600 shadow-emerald-100/70 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-none",
  },
  {
    title: "Listening Tests",
    value: "13",
    icon: Headphones,
    tileClassName: "border-blue-100 bg-blue-50 text-blue-600 shadow-blue-100/70 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:shadow-none",
  },
  {
    title: "Premium Tests",
    value: "43",
    icon: Crown,
    tileClassName: "border-amber-100 bg-amber-50 text-amber-600 shadow-amber-100/70 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none",
  },
  {
    title: "Feedback & Analytics",
    value: "AI",
    icon: BrainCircuit,
    tileClassName: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-600 shadow-fuchsia-100/70 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:shadow-none",
  },
] as const;

const skillCards = [
  {
    title: "Reading",
    subtitle: "77 tests",
    description: "Full tests and passage practice",
    href: "/tests?type=reading",
    button: "Open Reading",
    icon: BookOpen,
    tileClassName: "border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-none",
    buttonClassName: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/25 dark:text-emerald-300 dark:hover:bg-emerald-500/10",
  },
  {
    title: "Listening",
    subtitle: "13 tests",
    description: "Full tests and part-based practice",
    href: "/tests?type=listening",
    button: "Open Listening",
    icon: Headphones,
    tileClassName: "border-blue-100 bg-blue-50 text-blue-600 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:shadow-none",
    buttonClassName: "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-sky-500/25 dark:text-sky-300 dark:hover:bg-sky-500/10",
  },
  {
    title: "Writing",
    subtitle: "Task 1 & Task 2",
    description: "Get AI feedback on your writing",
    href: "/writing",
    button: "Open Writing",
    icon: Pencil,
    tileClassName: "border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300 dark:shadow-none",
    buttonClassName: "border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-500/25 dark:text-violet-300 dark:hover:bg-violet-500/10",
  },
  {
    title: "Speaking",
    subtitle: "AI Mock Interview",
    description: "Practice speaking with AI examiner",
    href: "/speaking",
    button: "Open Speaking",
    icon: Mic,
    tileClassName: "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300 dark:shadow-none",
    buttonClassName: "border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-500/25 dark:text-orange-300 dark:hover:bg-orange-500/10",
  },
  {
    title: "Full Mock",
    subtitle: "4 skills",
    description: "Reading, Listening, Writing, Speaking",
    href: "/tests",
    button: "Open Full Mock",
    icon: ClipboardCheck,
    tileClassName: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:shadow-none",
    buttonClassName: "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
    unavailable: true,
  },
] as const;

const collectionCards = [
  {
    title: "Cambridge Official",
    subtitle: "Cambridge 10-20",
    href: "/tests?type=reading&source=cambridge",
    imageSrc: "/images/cambridge.jpg",
    imageAlt: "Cambridge IELTS Academic 1-20 cover",
  },
  {
    title: "Recent Exam Papers",
    subtitle: "Latest real tests",
    href: "/tests?type=reading&source=real_exam",
    imageSrc: "/images/recent exam pepers.jpg",
    imageAlt: "Recent Exam Papers collection cover",
  },
  {
    title: "Exam Practice Tests",
    subtitle: "Test 1-55",
    href: "/tests?type=reading&source=custom",
    imageSrc: "/images/exam practice tests.jpg",
    imageAlt: "Exam Practice Tests collection cover",
  },
] as const;

const readingCollectionCards = [
  {
    title: "All Collections",
    subtitle: "77 tests",
    source: "all",
    imageSrc: "/images/all collections.jpg",
    imageAlt: "All Collections test library cover",
  },
  {
    title: "Cambridge Official",
    subtitle: "10-20",
    source: "cambridge",
    imageSrc: "/images/cambridge.jpg",
    imageAlt: "Cambridge IELTS Academic 1-20 cover",
  },
  {
    title: "Recent Exam Papers",
    subtitle: "Latest real tests",
    source: "real_exam",
    imageSrc: "/images/recent exam pepers.jpg",
    imageAlt: "Recent Exam Papers collection cover",
  },
  {
    title: "Exam Practice Tests",
    subtitle: "Test 1-55",
    source: "custom",
    imageSrc: "/images/exam practice tests.jpg",
    imageAlt: "Exam Practice Tests collection cover",
  },
] as const;

const listeningCollectionCards = [
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

const readingTabs = [
  { label: "All", value: "all" },
  { label: "Full Tests", value: "full" },
  { label: "Passage 1", value: "passage_1" },
  { label: "Passage 2", value: "passage_2" },
  { label: "Passage 3", value: "passage_3" },
] as const;

const listeningTabs = [
  { label: "All", value: "all" },
  { label: "Full Tests", value: "full" },
  { label: "Part 1", value: "part_1" },
  { label: "Part 2", value: "part_2" },
  { label: "Part 3", value: "part_3" },
  { label: "Part 4", value: "part_4" },
] as const;

function getReadingTabLabel(value: ReadingFormat) {
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

function getListeningTabLabel(value: ListeningFormat) {
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

function getCollectionTitle(title: string) {
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

function getSummaryTitle(title: string) {
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

function getSkillCardDescription(title: string, fallback: string) {
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

function getSkillCardButton(label: string) {
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

const readingTestCards = [
  {
    id: "reading-forgotten-forest-test-55",
    title: "The Forgotten Forest — Test 55",
    meta: "Cambridge Official · Passage 1",
    source: "cambridge",
    format: "passage_1",
    access: "free",
    order: 55,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: BookOpen,
    iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    href: "/tests?type=reading",
  },
  {
    id: "reading-cambridge-20-test-1",
    title: "Cambridge 20 — Reading Test 1",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "premium",
    order: 54,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
  {
    id: "reading-cambridge-20-test-2",
    title: "Cambridge 20 — Reading Test 2",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "premium",
    order: 53,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
  {
    id: "reading-cambridge-20-test-3",
    title: "Cambridge 20 — Reading Test 3",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "premium",
    order: 52,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
  {
    id: "reading-cambridge-20-test-4",
    title: "Cambridge 20 — Reading Test 4",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "premium",
    order: 51,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
  {
    id: "reading-recent-exam-paper-7",
    title: "Recent Exam Paper 7",
    meta: "Recent Exam Papers · Full Test",
    source: "real_exam",
    format: "full",
    access: "premium",
    order: 50,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-300",
    href: "/subscription",
  },
  {
    id: "reading-climate-change-solutions-test-41",
    title: "Climate Change Solutions — Test 41",
    meta: "Cambridge Official · Passage 3",
    source: "cambridge",
    format: "passage_3",
    access: "free",
    order: 41,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: BookOpen,
    iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    href: "/tests?type=reading",
  },
  {
    id: "reading-future-of-work-test-32",
    title: "The Future of Work — Test 32",
    meta: "Exam Practice Tests · Passage 2",
    source: "custom",
    format: "passage_2",
    access: "free",
    order: 32,
    badges: ["Free", "In progress"],
    button: "Continue",
    buttonVariant: "solid",
    icon: FileText,
    iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    href: "/exam-preview/reading?mode=practice",
  },
  {
    id: "reading-survey-form-test-12",
    title: "Survey Form — Test 12",
    meta: "Exam Practice Tests · Passage 1",
    source: "custom",
    format: "passage_1",
    access: "free",
    order: 12,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-300",
    href: "/tests?type=reading",
  },
  {
    id: "reading-cambridge-19-test-2",
    title: "Cambridge 19 — Reading Test 2",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "premium",
    order: 11,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
  {
    id: "reading-impact-of-tourism-test-23",
    title: "The Impact of Tourism — Test 23",
    meta: "Exam Practice Tests · Passage 2",
    source: "custom",
    format: "passage_2",
    access: "free",
    order: 10,
    badges: ["Free", "Completed"],
    button: "Review",
    buttonVariant: "solid",
    icon: FileText,
    iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    href: "/history",
  },
] as const;

const listeningTestCards = [
  {
    id: "listening-cam17-t1",
    title: "Cambridge 17 — Listening Test 1",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "free",
    order: 17,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-cam18-t2",
    title: "Cambridge 18 — Listening Test 2",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "premium",
    order: 18,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
  {
    id: "listening-recent-exam-paper-5",
    title: "Recent Exam Paper 5",
    meta: "Recent Exam Papers · Full Test",
    source: "real_exam",
    format: "full",
    access: "premium",
    order: 15,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-300",
    href: "/subscription",
  },
  {
    id: "listening-airport-information-test-13",
    title: "Airport Information — Test 13",
    meta: "Exam Practice Tests · Part 1",
    source: "custom",
    format: "part_1",
    access: "free",
    order: 13,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-student-accommodation-test-12",
    title: "Student Accommodation — Test 12",
    meta: "Exam Practice Tests · Part 2",
    source: "custom",
    format: "part_2",
    access: "free",
    order: 12,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-research-discussion-test-10",
    title: "Research Discussion — Test 10",
    meta: "Exam Practice Tests · Part 3",
    source: "custom",
    format: "part_3",
    access: "free",
    order: 10,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-university-lecture-test-8",
    title: "University Lecture — Test 8",
    meta: "Exam Practice Tests · Part 4",
    source: "custom",
    format: "part_4",
    access: "free",
    order: 8,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-cam16-t1",
    title: "Cambridge 16 — Listening Test 1",
    meta: "Cambridge Official · Part 1",
    source: "cambridge",
    format: "part_1",
    access: "premium",
    order: 16,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
] as const;

function normalizeActiveType(value: string | undefined): ActiveType {
  return value === "reading" || value === "listening" ? value : "all";
}

function normalizeReadingSource(value: string | undefined): ReadingSource {
  return value === "cambridge" || value === "real_exam" || value === "custom" ? value : "all";
}

function normalizeReadingFormat(value: string | undefined): ReadingFormat {
  return value === "full" || value === "passage_1" || value === "passage_2" || value === "passage_3" ? value : "all";
}

function normalizeListeningFormat(value: string | undefined): ListeningFormat {
  return value === "full" || value === "part_1" || value === "part_2" || value === "part_3" || value === "part_4" ? value : "all";
}

function normalizeReadingAccess(value: string | undefined): ReadingAccess {
  return value === "free" || value === "premium" ? value : "all";
}

function normalizeReadingSort(value: string | undefined): ReadingSort {
  return value === "oldest" || value === "title_az" || value === "not_attempted"
    ? value
    : "newest";
}

// 0 = should appear first for the given sort, 1 = afterwards. Ties fall back to
// the default ordering applied by each card comparator.
function getCardAttemptSortRank(
  state: "completed" | "active" | "none",
  sort: ReadingSort,
): number {
  if (sort === "not_attempted") {
    return state === "none" ? 0 : 1;
  }
  return 0;
}

function getReadingCardAttemptState(
  card: ReadingTestCard,
  catalogTests: TestCatalogItem[],
  userAttempts: AttemptRow[],
): "completed" | "active" | "none" {
  const resolved = resolveReadingCardTest(card, catalogTests);
  if (!resolved) {
    return "none";
  }
  if (userAttempts.some((attempt) => attempt.testId === resolved.id && attempt.status === "in_progress")) {
    return "active";
  }
  if (userAttempts.some((attempt) => attempt.testId === resolved.id && isCompletedAttempt(attempt))) {
    return "completed";
  }
  return "none";
}

function getListeningCardAttemptState(
  card: ListeningTestCard,
  catalogTests: TestCatalogItem[],
  userAttempts: AttemptRow[],
): "completed" | "active" | "none" {
  const resolved = resolveListeningCardTest(card, catalogTests);
  if (!resolved) {
    return "none";
  }
  if (userAttempts.some((attempt) => attempt.testId === resolved.id && attempt.status === "in_progress")) {
    return "active";
  }
  if (userAttempts.some((attempt) => attempt.testId === resolved.id && isCompletedAttempt(attempt))) {
    return "completed";
  }
  return "none";
}

function buildReadingTestsHref({
  source,
  format,
  access,
  sort,
  query,
}: {
  source?: ReadingSource;
  format?: ReadingFormat;
  access?: ReadingAccess;
  sort?: ReadingSort;
  query?: string;
}) {
  const params = new URLSearchParams();
  params.set("type", "reading");

  if (source && source !== "all") {
    params.set("source", source);
  }

  if (format && format !== "all") {
    params.set("format", format);
  }

  if (access && access !== "all") {
    params.set("access", access);
  }

  if (sort && sort !== "newest") {
    params.set("sort", sort);
  }

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  return `/tests?${params.toString()}`;
}

function buildListeningTestsHref({
  source,
  format,
  access,
  sort,
  query,
}: {
  source?: ReadingSource;
  format?: ListeningFormat;
  access?: ReadingAccess;
  sort?: ReadingSort;
  query?: string;
}) {
  const params = new URLSearchParams();
  params.set("type", "listening");

  if (source && source !== "all") {
    params.set("source", source);
  }

  if (format && format !== "all") {
    params.set("format", format);
  }

  if (access && access !== "all") {
    params.set("access", access);
  }

  if (sort && sort !== "newest") {
    params.set("sort", sort);
  }

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  return `/tests?${params.toString()}`;
}

function getContinueHref(attempt: AttemptRow) {
  const route = attempt.type === "listening" ? "/exam-preview/listening" : "/exam-preview/reading";
  return `${route}?attemptId=${attempt.id}&mode=${attempt.mode}&resume=${Date.now()}`;
}

function isCompletedAttempt(attempt: AttemptRow) {
  return attempt.status === "completed" || attempt.status === "submitted";
}

function toCardAttemptSummary(attempt: AttemptRow): TestCardAttemptSummary {
  return {
    id: attempt.id,
    mode: attempt.mode,
    status: attempt.status,
    score: attempt.score,
    band: attempt.band,
    totalQuestions: attempt.totalQuestions,
    lastSavedAt: attempt.lastSavedAt,
  };
}

function isResumeOrReviewAction(label: string) {
  return label === "Continue" || label === "Review";
}

function getTestActionButtonClassName(label: string, isPremiumCard: boolean) {
  return cn(
    "h-9 w-full gap-2 rounded-lg text-sm font-semibold shadow-none",
    !isPremiumCard && isResumeOrReviewAction(label)
      ? "border-orange-300 bg-orange-100 text-orange-700 hover:border-orange-400 hover:bg-orange-200 hover:text-orange-800 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:border-orange-500/45 dark:hover:bg-orange-500/22 dark:hover:text-orange-100"
      : "border-orange-200 bg-white text-orange-600 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-slate-950/40 dark:text-orange-300 dark:hover:bg-orange-500/10",
  );
}

function normalizeMatchText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getReadingCardTestNumber(card: ReadingTestCard) {
  return card.title.match(/\bTest\s*(\d+)\b/i)?.[1] ?? card.title.match(/(\d+)\s*$/)?.[1] ?? null;
}

function getReadingCardTestNumberValue(card: ReadingTestCard) {
  const value = getReadingCardTestNumber(card);
  return value ? Number(value) : null;
}

function getCambridgeBookAndTest(card: ReadingTestCard) {
  const book = card.title.match(/\bCambridge\s*(\d+)\b/i)?.[1];
  const test = getReadingCardTestNumberValue(card);

  return {
    book: book ? Number(book) : null,
    test,
  };
}

function compareReadingCardsByNewestTestNumber(a: ReadingTestCard, b: ReadingTestCard) {
  const aTest = getReadingCardTestNumberValue(a);
  const bTest = getReadingCardTestNumberValue(b);

  if (aTest !== null && bTest !== null && aTest !== bTest) {
    return bTest - aTest;
  }

  if (aTest !== null && bTest === null) {
    return -1;
  }

  if (aTest === null && bTest !== null) {
    return 1;
  }

  return b.order - a.order;
}

function compareCambridgeReadingCards(a: ReadingTestCard, b: ReadingTestCard) {
  const aCambridge = getCambridgeBookAndTest(a);
  const bCambridge = getCambridgeBookAndTest(b);

  if (aCambridge.book !== null && bCambridge.book !== null && aCambridge.book !== bCambridge.book) {
    return bCambridge.book - aCambridge.book;
  }

  if (aCambridge.book !== null && bCambridge.book === null) {
    return -1;
  }

  if (aCambridge.book === null && bCambridge.book !== null) {
    return 1;
  }

  if (aCambridge.test !== null && bCambridge.test !== null && aCambridge.test !== bCambridge.test) {
    return aCambridge.test - bCambridge.test;
  }

  return compareReadingCardsByNewestTestNumber(a, b);
}

function getCatalogTestNumber(test: TestCatalogItem) {
  return test.title.match(/\bTest\s*(\d+)\b/i)?.[1] ?? test.sourceDetail.match(/\bTest\s*(\d+)\b/i)?.[1] ?? null;
}

function getCatalogTestNumberValue(test: TestCatalogItem) {
  const value = getCatalogTestNumber(test);
  return value ? Number(value) : null;
}

function getReadingCardFallbackHref(
  card: ReadingTestCard,
  resolvedTest: TestCatalogItem | undefined,
  activeAttempt: AttemptRow | undefined,
  completedAttempt: AttemptRow | undefined,
) {
  if (card.access === "premium") {
    return "/subscription";
  }

  if (activeAttempt) {
    return getContinueHref(activeAttempt);
  }

  if (completedAttempt) {
    return `/attempts/${completedAttempt.id}/result`;
  }

  const testId = resolvedTest?.id ?? card.id;
  return `/exam-preview/reading?testId=${encodeURIComponent(testId)}&mode=guest`;
}

function resolveReadingCardTest(card: ReadingTestCard, catalogTests: TestCatalogItem[]) {
  const titleDisplay = getReadingCardTitleDisplay(card);
  const cardTitle = normalizeMatchText(card.title);
  const cardMainTitle = normalizeMatchText(titleDisplay.title);
  const cardSubtitle = normalizeMatchText(titleDisplay.subtitle);
  const cardNumber = getReadingCardTestNumber(card);

  const candidates = catalogTests.filter((test) => test.type === "reading" && test.status === "published");
  const exact = candidates.find((test) => test.id === card.id || test.slug === card.id || normalizeMatchText(test.title) === cardTitle);
  if (exact) {
    return exact;
  }

  let bestMatch: { test: TestCatalogItem; score: number } | null = null;

  for (const test of candidates) {
    const testTitle = normalizeMatchText(test.title);
    const testSourceDetail = normalizeMatchText(test.sourceDetail);
    const testSectionText = normalizeMatchText(test.sections.map((section) => `${section.title} ${section.teaser}`).join(" "));
    const testNumber = getCatalogTestNumber(test);
    let score = 0;

    if (getTestSourceKey(test.source) === card.source || getTestSourceKey(test.sourceDetail) === card.source) {
      score += 6;
    }

    if (test.format === card.format) {
      score += 4;
    } else if (card.format !== "full" && test.format !== "full") {
      score += 2;
    }

    if ((card.access === "premium") === (test.accessType === "premium")) {
      score += 1;
    }

    if (cardNumber && testNumber === cardNumber) {
      score += 3;
    }

    if (cardMainTitle && (testTitle.includes(cardMainTitle) || cardMainTitle.includes(testTitle))) {
      score += 4;
    }

    if (cardSubtitle && (testTitle.includes(cardSubtitle) || testSectionText.includes(cardSubtitle) || testSourceDetail.includes(cardSubtitle))) {
      score += 5;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { test, score };
    }
  }

  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.test;
  }

  return candidates.find((test) => getTestSourceKey(test.source) === card.source || getTestSourceKey(test.sourceDetail) === card.source)
    ?? candidates[0];
}

function formatDisplay(testFormat: TestCatalogItem["format"]) {
  if (!testFormat || testFormat === "full") {
    return "Full Test";
  }

  return testFormat
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function IconTile({
  icon: Icon,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  className: string;
}) {
  return (
    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm", className)}>
      <Icon className="h-6 w-6" />
    </span>
  );
}

function CollectionImageTile({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative h-[4.25rem] w-[3.125rem] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800",
        className,
      )}
    >
      <Image src={src} alt={alt} fill sizes="96px" quality={100} className="object-cover" />
    </span>
  );
}

function ReadingCompletedBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25">
      <CheckCircle2 className="h-3 w-3" />
      Completed
    </span>
  );
}

function NewTestBadge() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-red-200 bg-red-50 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
      New
    </span>
  );
}

type ReadingTestCard = (typeof readingTestCards)[number];

function getReadingFormatBadgeLabel(format: ReadingTestCard["format"]) {
  if (format === "full") {
    return "Full Test";
  }

  return format
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getReadingCardTitleDisplay(card: ReadingTestCard) {
  if (card.source === "cambridge") {
    const [mainTitle, secondaryTitle] = card.title.split(/\s*[—-]\s*/);

    return {
      title: mainTitle?.trim() || card.title,
      subtitle: secondaryTitle?.trim() || null,
    };
  }

  const explicitTestNumber = card.title.match(/\bTest\s*(\d+)\b/i)?.[1];
  const trailingNumber = card.title.match(/(\d+)\s*$/)?.[1];
  const testNumber = explicitTestNumber ?? trailingNumber;
  const passageTitle = card.title
    .replace(/\s*[—-]\s*Test\s*\d+\s*$/i, "")
    .replace(/\s+\d+\s*$/, "")
    .trim();
  const shouldShowSubtitle = passageTitle
    && passageTitle !== card.title
    && passageTitle.toLowerCase() !== "recent exam paper";

  return {
    title: testNumber ? `Test ${testNumber}` : card.title,
    subtitle: shouldShowSubtitle ? passageTitle : null,
  };
}

function getReadingCompletedScoreLabel(format: ReadingTestCard["format"]) {
  if (format === "full") {
    return "0/40 correct • Band 0.0";
  }

  return "10/12 correct";
}

function getReadingBookmarkItem(card: ReadingTestCard) {
  return {
    id: card.id,
    title: card.title,
    type: "reading" as const,
    format: card.format,
    accessType: card.access === "premium" ? ("premium" as const) : ("public" as const),
    source: card.source,
    sourceLabel: getTestSourceLabel(card.source),
    description: card.meta,
    questionCount: null,
    estimatedMinutes: null,
    href: card.href,
    actionLabel: card.button,
  };
}

type ListeningTestCard = (typeof listeningTestCards)[number];

function getListeningCardTestNumber(card: ListeningTestCard) {
  return card.title.match(/\bTest\s*(\d+)\b/i)?.[1] ?? card.title.match(/(\d+)\s*$/)?.[1] ?? null;
}

function getListeningCardFallbackHref(
  card: ListeningTestCard,
  resolvedTest: TestCatalogItem | undefined,
  activeAttempt: AttemptRow | undefined,
  completedAttempt: AttemptRow | undefined,
) {
  if (card.access === "premium") {
    return "/subscription";
  }

  if (activeAttempt) {
    return getContinueHref(activeAttempt);
  }

  if (completedAttempt) {
    return `/attempts/${completedAttempt.id}/result`;
  }

  const testId = resolvedTest?.id ?? card.id;
  return `/exam-preview/listening?testId=${encodeURIComponent(testId)}&mode=guest`;
}

function getListeningFormatBadgeLabel(format: ListeningTestCard["format"]) {
  if (format === "full") {
    return "Full Test";
  }

  return format
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getListeningCardTitleDisplay(card: ListeningTestCard) {
  if (card.source === "cambridge") {
    const [mainTitle, secondaryTitle] = card.title.split(/\s*[—-]\s*/);

    return {
      title: mainTitle?.trim() || card.title,
      subtitle: secondaryTitle?.trim() || null,
    };
  }

  const explicitTestNumber = card.title.match(/\bTest\s*(\d+)\b/i)?.[1];
  const trailingNumber = card.title.match(/(\d+)\s*$/)?.[1];
  const testNumber = explicitTestNumber ?? trailingNumber;
  const partTitle = card.title
    .replace(/\s*[—-]\s*Test\s*\d+\s*$/i, "")
    .replace(/\s+\d+\s*$/, "")
    .trim();
  const shouldShowSubtitle = partTitle
    && partTitle !== card.title
    && partTitle.toLowerCase() !== "recent exam paper";

  return {
    title: testNumber ? `Test ${testNumber}` : card.title,
    subtitle: shouldShowSubtitle ? partTitle : null,
  };
}

function getListeningCompletedScoreLabel(format: ListeningTestCard["format"]) {
  if (format === "full") {
    return "0/40 correct • Band 0.0";
  }

  return "8/10 correct";
}

function getListeningBookmarkItem(card: ListeningTestCard) {
  return {
    id: card.id,
    title: card.title,
    type: "listening" as const,
    format: card.format,
    accessType: card.access === "premium" ? ("premium" as const) : ("public" as const),
    source: card.source,
    sourceLabel: getTestSourceLabel(card.source),
    description: card.meta,
    questionCount: null,
    estimatedMinutes: null,
    href: card.href,
    actionLabel: card.button,
  };
}

function resolveListeningCardTest(card: ListeningTestCard, catalogTests: TestCatalogItem[]) {
  const titleDisplay = getListeningCardTitleDisplay(card);
  const cardTitle = normalizeMatchText(card.title);
  const cardMainTitle = normalizeMatchText(titleDisplay.title);
  const cardSubtitle = normalizeMatchText(titleDisplay.subtitle);
  const cardNumber = getListeningCardTestNumber(card);

  const candidates = catalogTests.filter((test) => test.type === "listening" && test.status === "published");
  const exact = candidates.find((test) => test.id === card.id || test.slug === card.id || normalizeMatchText(test.title) === cardTitle);
  if (exact) {
    return exact;
  }

  let bestMatch: { test: TestCatalogItem; score: number } | null = null;

  for (const test of candidates) {
    const testTitle = normalizeMatchText(test.title);
    const testSourceDetail = normalizeMatchText(test.sourceDetail);
    const testSectionText = normalizeMatchText(test.sections.map((section) => `${section.title} ${section.teaser}`).join(" "));
    const testNumber = getCatalogTestNumber(test);
    let score = 0;

    if (getTestSourceKey(test.source) === card.source || getTestSourceKey(test.sourceDetail) === card.source) {
      score += 6;
    }

    if (test.format === card.format) {
      score += 4;
    } else if (card.format !== "full" && String(test.format).startsWith("part_")) {
      score += 2;
    }

    if ((card.access === "premium") === (test.accessType === "premium")) {
      score += 1;
    }

    if (cardNumber && testNumber === cardNumber) {
      score += 3;
    }

    if (cardMainTitle && (testTitle.includes(cardMainTitle) || cardMainTitle.includes(testTitle))) {
      score += 4;
    }

    if (cardSubtitle && (testTitle.includes(cardSubtitle) || testSectionText.includes(cardSubtitle) || testSourceDetail.includes(cardSubtitle))) {
      score += 5;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { test, score };
    }
  }

  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.test;
  }

  return candidates.find((test) => getTestSourceKey(test.source) === card.source || getTestSourceKey(test.sourceDetail) === card.source)
    ?? candidates[0];
}


function HeaderIllustration() {
  return (
    <div className="hidden h-36 w-64 shrink-0 lg:block" aria-hidden="true">
      <svg
        className="animated h-full w-full overflow-visible"
        id="freepik_stories-online-test"
        viewBox="0 0 500 500"
        focusable="false"
      >
        <style>{`
          svg#freepik_stories-online-test .online-test-floor {
            animation: onlineTestSlideUp .72s ease-out both;
            transform-origin: 250px 408px;
          }
          svg#freepik_stories-online-test .online-test-shadow {
            animation: onlineTestLightSpeed .76s ease-out both;
            transform-origin: 304px 385px;
          }
          svg#freepik_stories-online-test .online-test-device {
            animation: onlineTestSlideDown .82s ease-out both;
            transform-origin: 236px 236px;
          }
          svg#freepik_stories-online-test .online-test-paper {
            animation: onlineTestFadeIn .9s ease-out both;
            transform-origin: 213px 184px;
          }
          svg#freepik_stories-online-test .online-test-accent {
            animation: onlineTestSlideLeft .86s ease-out both;
            transform-origin: 385px 180px;
          }
          @keyframes onlineTestSlideUp {
            from { opacity: 0; transform: translateY(28px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes onlineTestLightSpeed {
            from { opacity: 0; transform: translate3d(34px, 0, 0) skewX(-12deg); }
            70% { opacity: 1; transform: skewX(3deg); }
            to { opacity: 1; transform: translate3d(0, 0, 0); }
          }
          @keyframes onlineTestSlideDown {
            from { opacity: 0; transform: translateY(-22px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes onlineTestFadeIn {
            from { opacity: 0; transform: scale(.94); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes onlineTestSlideLeft {
            from { opacity: 0; transform: translateX(24px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            svg#freepik_stories-online-test .online-test-floor,
            svg#freepik_stories-online-test .online-test-shadow,
            svg#freepik_stories-online-test .online-test-device,
            svg#freepik_stories-online-test .online-test-paper,
            svg#freepik_stories-online-test .online-test-accent {
              animation: none;
            }
          }
        `}</style>

        <g className="online-test-floor text-slate-100 dark:text-slate-800">
          <ellipse cx="252" cy="408" rx="206" ry="58" fill="currentColor" />
        </g>

        <g className="online-test-shadow text-slate-200 dark:text-slate-950">
          <path
            d="M159 365.5 300 284.2c5.7-3.3 15.1-3.3 20.8 0l117.4 67.8c5.7 3.3 5.7 8.7 0 12L297.2 445.4c-5.7 3.3-15.1 3.3-20.8 0L159 377.5c-5.7-3.3-5.7-8.7 0-12Z"
            fill="currentColor"
            opacity=".82"
          />
          <path
            d="M66.8 407.8 233.6 311.5c3.2-1.9 8.5-1.9 11.7 0l57.5 33.2c3.2 1.9 3.2 4.9 0 6.8L136 447.8c-3.2 1.9-8.5 1.9-11.7 0l-57.5-33.2c-3.2-1.9-3.2-4.9 0-6.8Z"
            fill="currentColor"
            opacity=".7"
          />
        </g>

        <g className="online-test-device">
          <path
            d="M92.8 338.8c-8 4.6-14.5.9-14.5-8.4V153.2c0-9.2 6.5-20.4 14.5-25L303.2 6.7c8-4.6 14.5-.9 14.5 8.4v177.2c0 9.2-6.5 20.4-14.5 25L92.8 338.8Z"
            className="fill-slate-700 dark:fill-slate-950"
          />
          <path
            d="M97.4 316.7V160.1c0-4 2.8-8.9 6.3-10.9L294 39.3c3.5-2 6.3-.4 6.3 3.6v156.6c0 4-2.8 8.9-6.3 10.9L103.7 320.3c-3.5 2-6.3.4-6.3-3.6Z"
            className="fill-slate-900 dark:fill-slate-800"
          />
          <path
            d="M78.3 303.9v26.5c0 9.3 6.5 13 14.5 8.4l210.4-121.5c8-4.6 14.5-15.8 14.5-25v-26.5Z"
            className="fill-slate-100 dark:fill-slate-700"
          />
          <path
            d="M184.1 333.8 245.8 298c4-2.3 7.3-.4 7.3 4.2v25.4c0 4.6 3.2 10.2 7.3 12.5l27.8 16.1c7.6 4.4 7.6 11.6 0 16l-55.1 31.8c-7.6 4.4-20 4.4-27.6 0l-55.9-32.3c-7.6-4.4-7.6-11.6 0-16l34.5-19.9Z"
            className="fill-slate-200 dark:fill-slate-800"
          />
          <path
            d="M164.9 354.9 290.1 282.6c4-2.3 10.6-2.3 14.6 0l108.6 62.7c4 2.3 4 6.1 0 8.4L288.1 426c-4 2.3-10.6 2.3-14.6 0l-108.6-62.7c-4-2.3-4-6.1 0-8.4Z"
            className="fill-slate-700 dark:fill-slate-950"
          />
          <path
            d="M182.2 358.6 297.1 292.3c2.3-1.3 6-1.3 8.2 0l88.8 51.3c2.3 1.3 2.3 3.4 0 4.7L279.3 414.6c-2.3 1.3-6 1.3-8.2 0l-88.8-51.3c-2.3-1.3-2.3-3.4-.1-4.7Z"
            className="fill-slate-600 dark:fill-slate-900"
          />
          <path
            d="M228 365.1 300.2 323.4c2.1-1.2 5.4-1.2 7.5 0l17.7 10.2c2.1 1.2 2.1 3.2 0 4.3l-72.2 41.7c-2.1 1.2-5.4 1.2-7.5 0L228 369.4c-2.1-1.2-2.1-3.1 0-4.3Z"
            className="fill-slate-400/70 dark:fill-slate-700"
          />
        </g>

        <g className="online-test-paper">
          <path
            d="M131.8 143.2 269.4 63.8c3.7-2.1 6.7-.4 6.7 3.8v107.8c0 4.2-3 9.4-6.7 11.5l-137.6 79.4c-3.7 2.1-6.7.4-6.7-3.8V154.7c0-4.2 3-9.4 6.7-11.5Z"
            className="fill-white dark:fill-slate-100"
          />
          <path
            d="M145.9 159.2 254.8 96.3c2-1.2 3.6-.2 3.6 2v11.4c0 2.2-1.6 5-3.6 6.1l-108.9 62.9c-2 1.2-3.6.2-3.6-2v-11.4c0-2.2 1.6-4.9 3.6-6.1Z"
            fill="#ff7800"
            opacity=".9"
          />
          <path
            d="M147.3 200.8 205.9 167c2.3-1.3 4.1-.3 4.1 2.4 0 2.6-1.8 5.8-4.1 7.1l-58.6 33.8c-2.3 1.3-4.1.3-4.1-2.4 0-2.6 1.8-5.8 4.1-7.1Z"
            className="fill-slate-300 dark:fill-slate-400"
          />
          <path
            d="M147.3 226.5 223.4 182.6c2.3-1.3 4.1-.3 4.1 2.4 0 2.6-1.8 5.8-4.1 7.1L147.3 236c-2.3 1.3-4.1.3-4.1-2.4 0-2.6 1.8-5.8 4.1-7.1Z"
            className="fill-slate-200 dark:fill-slate-300"
          />
          <path
            d="M236.5 156.9c0 11.6-8.1 25.6-18.1 31.4-10 5.8-18.1 1.1-18.1-10.5s8.1-25.6 18.1-31.4c10-5.8 18.1-1.1 18.1 10.5Z"
            fill="#ff7800"
            opacity=".12"
          />
          <path
            d="M212.9 172.6 218.6 175.8 228.8 151.2"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          <path
            d="M145.2 254.4 258.7 188.9"
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-300"
            strokeLinecap="round"
            strokeWidth="6"
          />
        </g>

        <g className="online-test-accent">
          <path
            d="M365.6 88.1c26.6-15.4 48.2-2.9 48.2 27.8s-21.6 68.1-48.2 83.5c-26.6 15.4-48.2 2.9-48.2-27.8s21.6-68.1 48.2-83.5Z"
            className="fill-white dark:fill-slate-900"
          />
          <path
            d="M365.6 101.6c20.2-11.7 36.6-2.2 36.6 21.1s-16.4 51.7-36.6 63.4c-20.2 11.7-36.6 2.2-36.6-21.1s16.4-51.7 36.6-63.4Z"
            className="fill-slate-100 dark:fill-slate-800"
          />
          <path
            d="M365.7 141.4 365.7 120.2"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M365.7 141.4 383.8 130.9"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M350.2 219.6 385.4 199.3c4.2-2.4 7.6-.5 7.6 4.4v39.8c0 4.8-3.4 10.8-7.6 13.2L350.2 277c-4.2 2.4-7.6.5-7.6-4.4v-39.8c0-4.9 3.4-10.8 7.6-13.2Z"
            fill="#ff7800"
            opacity=".16"
          />
          <path
            d="M356.8 235.8 378.7 223.1M356.8 251.8 372 243"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M101.7 380.2c16.7-2.1 30.1 2.8 40.2 14.7-17 2.8-30.8-2.2-40.2-14.7Z"
            fill="#ff7800"
            opacity=".68"
          />
          <path
            d="M133.9 381.9c5.4-18.4 14.9-30.3 28.6-35.7 1.1 19.6-8.6 31.8-28.6 35.7Z"
            fill="#ff7800"
            opacity=".86"
          />
          <path
            d="M119.2 380.1c-8.8-17.8-9.4-34.5-1.8-50 12.9 13.9 13.5 30.6 1.8 50Z"
            fill="#ff7800"
            opacity=".48"
          />
        </g>
      </svg>
    </div>
  );
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const activeType = normalizeActiveType(searchParams?.type);

  if (activeType === "reading") {
    const [catalogTests, userAttempts] = await Promise.all([
      getCatalogTests({ type: "reading" }),
      getUserAttempts(),
    ]);

    return (
      <PracticeCatalogView
        testType="reading"
        catalogTests={catalogTests}
        userAttempts={userAttempts}
      />
    );
  }

  if (activeType === "listening") {
    const [catalogTests, userAttempts] = await Promise.all([
      getCatalogTests({ type: "listening" }),
      getUserAttempts(),
    ]);

    return (
      <PracticeCatalogView
        testType="listening"
        catalogTests={catalogTests}
        userAttempts={userAttempts}
      />
    );
  }

  const searchQuery = (searchParams?.q ?? "").trim().toLowerCase();

  const [catalogTests, userAttempts] = await Promise.all([
    getCatalogTests(),
    getUserAttempts(),
  ]);

  const publishedTests = catalogTests
    .filter((test) => test.status === "published")
    .filter((test) => {
      if (!searchQuery) {
        return true;
      }
      return `${test.title} ${test.sourceDetail} ${getTestSourceLabel(test.source)} ${formatDisplay(test.format)}`
        .toLowerCase()
        .includes(searchQuery);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const continueAttempt = userAttempts.find((attempt) => attempt.status === "in_progress");
  const continueTitle = continueAttempt?.testTitle ?? "Voyage of Going: beyond the blue line — Test 10";
  const continueProgress = Math.max(0, Math.min(100, Math.round(continueAttempt?.progressPercent ?? 2)));
  const continueAnswered = continueAttempt?.answeredCount && continueAttempt.totalQuestions
    ? `${continueAttempt.answeredCount}/${continueAttempt.totalQuestions} answers`
    : "1/40 answers";
  const continueSpent = continueAttempt?.timeSpent ?? "20:10";
  const continueHref = continueAttempt ? getContinueHref(continueAttempt) : "/tests?type=reading";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <TestsRefreshOnMount />
      <div className="mx-auto flex w-full max-w-[82rem] flex-col gap-4 pb-10">
        <section className="-mb-2 -mt-4 px-6 pb-0 pt-1 sm:-mt-5 sm:px-7 sm:pb-0 sm:pt-0 lg:-mb-3">
          <div className="flex translate-y-2 items-start justify-between gap-6 sm:translate-y-3">
            <div className="max-w-2xl">
              <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem]">{"Practice Tests"}</h1>
              <p className="mt-1 text-base leading-7 text-slate-500 dark:text-slate-400">
                {"Choose a skill or collection and continue your IELTS practice."}
              </p>
            </div>
            <HeaderIllustration />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_22px_-20px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={cn(
                    "flex h-20 items-center gap-3 px-3 py-3",
                    index % 2 === 1 && "sm:border-l sm:border-slate-100 dark:sm:border-slate-800",
                    index > 1 && "sm:border-t sm:border-slate-100 dark:sm:border-slate-800 xl:border-t-0",
                    index > 0 && "xl:border-l xl:border-slate-100 dark:xl:border-slate-800",
                  )}
                >
                  <IconTile icon={Icon} className={card.tileClassName} />
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none text-slate-950 dark:text-slate-50">{card.value}</p>
                    <p className="mt-1 whitespace-nowrap text-[13px] font-semibold text-slate-500 dark:text-slate-400">{getSummaryTitle(card.title)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_-20px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
              <span className="flex h-[4.25rem] w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600 shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:shadow-none">
                <CirclePlay className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-1 text-base font-semibold text-slate-950 dark:text-slate-50">{continueTitle}</h2>
                <div className="mt-0.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Reading · {continueProgress}% completed</p>
                  <p className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">{continueAnswered} · {continueSpent} spent</p>
                </div>
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${continueProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <Button asChild className="h-11 w-full rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-none hover:bg-orange-600 xl:w-auto">
              <Link href={continueHref}>{"Continue Test"}</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">{"Browse by Skill"}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-4">
            {skillCards.map((card) => {
              const Icon = card.icon;
              const unavailable = "unavailable" in card && card.unavailable;
              return (
                <article
                  key={card.title}
                  data-disabled={unavailable ? "true" : undefined}
                  className={cn(
                    "relative flex min-h-[12.5rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_-18px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none",
                    unavailable && "border-slate-200/80 bg-slate-50/75 opacity-60 grayscale dark:border-slate-800/70 dark:bg-slate-900/45",
                  )}
                >
                  {unavailable ? (
                    <span className="absolute right-3 top-3 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase leading-none text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                      {"Planned"}
                    </span>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <IconTile icon={Icon} className={card.tileClassName} />
                    <div className="min-w-0 pr-12">
                      <h3 className="text-lg font-semibold leading-tight text-slate-950 dark:text-slate-50">{card.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">{card.subtitle}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex-1">
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{getSkillCardDescription(card.title, card.description)}</p>
                  </div>
                  {unavailable ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      className="mt-3 h-10 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-400 shadow-none disabled:opacity-100 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-500"
                    >
                      {"Planned"}
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className={cn("mt-3 h-10 w-full rounded-xl border bg-white text-sm font-semibold shadow-none dark:bg-slate-950/60", card.buttonClassName)}>
                      <Link href={card.href}>{getSkillCardButton(card.button)}</Link>
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">{"Browse by Collection"}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
            {collectionCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="flex h-[6.5rem] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_18px_-18px_rgba(15,23,42,0.14)] transition-colors hover:border-orange-200 hover:bg-orange-50/20 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none dark:hover:border-orange-500/30 dark:hover:bg-orange-500/10"
              >
                <CollectionImageTile src={card.imageSrc} alt={card.imageAlt} className="h-[4.5rem] w-[3.375rem]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-slate-950 dark:text-slate-50">{getCollectionTitle(card.title)}</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{card.subtitle}</span>
                </span>
                <ArrowRight className="h-5 w-5 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>

        <LatestTestsPanel tests={publishedTests} attempts={userAttempts} initialFilter={activeType} />
      </div>
    </div>
  );
}
