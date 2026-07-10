"use client";

import { CheckCircle2, Image, PracticeCatalogFilters, PracticeCatalogType, cn, parsePracticeCatalogFilters, replacePracticeCatalogUrl, useCallback, useEffect, useSearchParams, useState } from "./practice-catalog-view-dependencies";

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

export function getCollectionTitle(title: string) {
  return title;
}

export function usePracticeCatalogFilters(testType: PracticeCatalogType) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PracticeCatalogFilters>(() =>
    parsePracticeCatalogFilters(new URLSearchParams(searchParams.toString()), testType),
  );

  useEffect(() => {
    const handlePopState = () => {
      setFilters(parsePracticeCatalogFilters(new URLSearchParams(window.location.search), testType));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [testType]);

  const updateFilters = useCallback(
    (updates: Partial<PracticeCatalogFilters>) => {
      setFilters((current) => {
        const next = { ...current, ...updates };
        replacePracticeCatalogUrl(testType, next);
        return next;
      });
    },
    [testType],
  );

  return { filters, updateFilters };
}

export function CollectionImageTile({
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

export function CompletedBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25">
      <CheckCircle2 className="h-3 w-3" />
      Completed
    </span>
  );
}

export function NewTestBadge() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-red-200 bg-red-50 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
      New
    </span>
  );
}
