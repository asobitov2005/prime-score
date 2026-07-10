import { BookOpen, BrainCircuit, ClipboardCheck, Crown, Folder, Headphones, Mic, Pencil } from "./page-dependencies";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export type ActiveType = "all" | "reading" | "listening";

export type ReadingSource = "all" | "cambridge" | "real_exam" | "custom";

export type ReadingFormat = "all" | "full" | "passage_1" | "passage_2" | "passage_3";

export type ListeningFormat = "all" | "full" | "part_1" | "part_2" | "part_3" | "part_4";

export type ReadingAccess = "all" | "free" | "premium";

export type ReadingSort = "newest" | "oldest" | "title_az" | "not_attempted";

export interface TestsPageProps {
  searchParams?: {
    type?: string;
    q?: string;
    source?: string;
    format?: string;
    access?: string;
    sort?: string;
  };
}

export const summaryCards = [
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

export const skillCards = [
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

export const collectionCards = [
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

export const readingCollectionCards = [
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
