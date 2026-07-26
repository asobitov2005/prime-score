"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { BookmarkToggleButton } from "@/components/bookmark-toggle-button";
import { StartTestModal } from "@/components/start-test-modal";
import type { AttemptRow, TestCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  parsePracticeCatalogFilters,
  replacePracticeCatalogUrl,
  type PracticeCatalogFilters,
  type PracticeCatalogSource,
  type PracticeCatalogType,
} from "./practice-catalog-params";
import {
  filterPracticeCatalogTests,
  formatCatalogTestFormat,
  getCatalogActionButtonClassName,
  getCatalogBookmarkItem,
  getCatalogCardTitleClassName,
  getCatalogCardTitleDisplay,
  getCatalogCompletedScoreLabel,
  isCompletedCatalogAttempt,
  isNewTestCreatedAt,
  sortCatalogTests,
  splitCatalogTestsForDisplay,
  toCatalogAttemptSummary,
} from "./practice-catalog-utils";
import { ReadingTestsFilterSelects } from "./reading-tests-filter-selects";

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

function getCollectionTitle(title: string) {
  return title;
}

function usePracticeCatalogFilters(testType: PracticeCatalogType) {
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

function CompletedBadge() {
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

function PracticeCatalogTestCard({
  test,
  userAttempts,
}: {
  test: TestCatalogItem;
  userAttempts: AttemptRow[];
}) {
  const activeAttempt = userAttempts.find((attempt) => attempt.testId === test.id && attempt.status === "in_progress");
  const completedAttempt = userAttempts.find((attempt) => attempt.testId === test.id && isCompletedCatalogAttempt(attempt));
  const bookmarkItem = getCatalogBookmarkItem(test);
  const titleDisplay = getCatalogCardTitleDisplay(test);
  const isCompleted = Boolean(completedAttempt) && !activeAttempt;
  const isPremiumCard = test.accessType === "premium";
  const isNewTest = isNewTestCreatedAt(test.createdAt);
  const fallbackActionLabel = isPremiumCard
    ? "Unlock"
    : activeAttempt
      ? "Continue"
      : completedAttempt
        ? "Review"
        : "Start Test";
  const actionClassName = getCatalogActionButtonClassName(fallbackActionLabel, isPremiumCard);

  return (
    <article className="flex min-h-[10rem] flex-col rounded-[14px] border border-slate-200 bg-white p-3.5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h2
            className={cn(
              "min-w-0 flex-1 truncate font-semibold leading-snug text-slate-950 dark:text-slate-50",
              getCatalogCardTitleClassName(test),
            )}
          >
            {titleDisplay.title}
          </h2>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <span
              className={cn(
                "inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold",
                test.format === "full"
                  ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
              )}
            >
              {formatCatalogTestFormat(test.format)}
            </span>
          </div>
        </div>
        <div className="-mt-0.5 flex min-h-7 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {titleDisplay.subtitle ? (
              <p className="line-clamp-1 min-w-0 text-[14px] font-medium leading-5 text-slate-500 dark:text-slate-400">
                {titleDisplay.subtitle}
              </p>
            ) : (
              <span className="min-w-0 flex-1" aria-hidden="true" />
            )}
            {isNewTest ? <NewTestBadge /> : null}
          </div>
          <BookmarkToggleButton item={bookmarkItem} className="h-8 w-8 shrink-0" iconClassName="h-4 w-4" />
        </div>
      </div>
      <div className="mt-auto">
        {isCompleted ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <CompletedBadge />
            <span className="truncate text-right text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {getCatalogCompletedScoreLabel(test, completedAttempt)}
            </span>
          </div>
        ) : null}
        <StartTestModal
          test={test}
          activeAttempt={activeAttempt ? toCatalogAttemptSummary(activeAttempt) : undefined}
          completedAttempt={completedAttempt ? toCatalogAttemptSummary(completedAttempt) : undefined}
          compactAction
          unlockLabel={"Unlock"}
          startLabel={"Start Test"}
          continueLabel={"Continue"}
          reviewLabel={"Review"}
          buttonClassName={actionClassName}
        />
      </div>
    </article>
  );
}

function PracticeCatalogTestsGrid({
  tests,
  sort,
  source,
  userAttempts,
}: {
  tests: TestCatalogItem[];
  sort: PracticeCatalogFilters["sort"];
  source: PracticeCatalogSource;
  userAttempts: AttemptRow[];
}) {
  if (source !== "cambridge") {
    const sortedTests = sortCatalogTests(tests, sort, userAttempts);

    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedTests.map((test) => (
          <PracticeCatalogTestCard key={test.id} test={test} userAttempts={userAttempts} />
        ))}
      </section>
    );
  }

  const { sortedBooks, cambridgeGroups } = splitCatalogTestsForDisplay(tests);

  return (
    <div className="space-y-6">
      {sortedBooks.map((bookNumber) => (
        <section key={bookNumber}>
          <h2 className="mb-3 text-base font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {`Cambridge ${bookNumber}`}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(cambridgeGroups.get(bookNumber) ?? []).map((test) => (
              <PracticeCatalogTestCard key={test.id} test={test} userAttempts={userAttempts} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PracticeCatalogView({
  testType,
  catalogTests,
  userAttempts,
}: {
  testType: PracticeCatalogType;
  catalogTests: TestCatalogItem[];
  userAttempts: AttemptRow[];
}) {
  const { filters, updateFilters } = usePracticeCatalogFilters(testType);
  const isReading = testType === "reading";
  const collectionCards = isReading ? readingCollectionCards : listeningCollectionCards;
  const formatTabs = isReading ? readingTabs : listeningTabs;
  const activeCollectionClass = isReading
    ? "border-emerald-200 bg-emerald-50/45 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:border-emerald-500/45"
    : "border-sky-200 bg-sky-50/45 hover:border-sky-300 dark:border-sky-500/30 dark:bg-sky-500/10 dark:hover:border-sky-500/45";
  const activeCollectionTextClass = isReading
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-sky-700 dark:text-sky-300";
  const activeCollectionIconClass = isReading
    ? "border-emerald-300 ring-2 ring-emerald-200 dark:border-emerald-400/60 dark:ring-emerald-500/25"
    : "border-sky-300 ring-2 ring-sky-200 dark:border-sky-400/60 dark:ring-sky-500/25";
  const activeChevronClass = isReading
    ? "text-emerald-500 group-hover:text-emerald-600 dark:text-emerald-400 dark:group-hover:text-emerald-300"
    : "text-sky-500 group-hover:text-sky-600 dark:text-sky-400 dark:group-hover:text-sky-300";

  const filteredTests = useMemo(
    () =>
      filterPracticeCatalogTests({
        catalogTests,
        testType,
        source: filters.source,
        format: filters.format,
        access: filters.access,
        query: filters.query,
      }),
    [catalogTests, filters.access, filters.format, filters.query, filters.source, testType],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-[82rem] pb-10">
        <section className="pt-1">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Link href="/tests" className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                {"Practice Tests"}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700" />
              <span className="text-slate-800 dark:text-slate-200">{isReading ? "Reading" : "Listening"}</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem]">
              {isReading ? "Reading Tests" : "Listening Tests"}
            </h1>
            {!isReading ? (
              <p className="mt-2 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">
                {"Browse full tests or individual parts to improve your Listening skills."}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {collectionCards.map((card) => {
            const active = filters.source === card.source;
            return (
              <button
                key={card.title}
                type="button"
                onClick={() => updateFilters({ source: card.source as PracticeCatalogSource })}
                className={cn(
                  "group flex min-h-[5rem] items-center gap-3 rounded-[14px] border border-slate-200 bg-white p-3 text-left shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)] transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none dark:hover:border-slate-700 sm:min-h-[6.25rem] sm:gap-4 sm:p-4",
                  active && activeCollectionClass,
                )}
              >
                <CollectionImageTile
                  src={card.imageSrc}
                  alt={card.imageAlt}
                  className={cn("h-[3.5rem] w-[2.625rem] sm:h-[4.25rem] sm:w-[3.125rem]", active && activeCollectionIconClass)}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold text-slate-900 dark:text-slate-50",
                      active && activeCollectionTextClass,
                    )}
                  >
                    {getCollectionTitle(card.title)}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{card.subtitle}</span>
                </span>
                <ChevronRight
                  className={cn(
                    "hidden h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400 sm:block",
                    active && activeChevronClass,
                  )}
                />
              </button>
            );
          })}
        </section>

        <section className="mt-8 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] dark:border-slate-800 [&::-webkit-scrollbar]:hidden">
            <div className="flex w-full items-end justify-between gap-x-2 gap-y-2 sm:w-max sm:min-w-full sm:justify-start sm:gap-x-6">
              {formatTabs.map((tab) => {
                const active = filters.format === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => updateFilters({ format: tab.value })}
                    className={cn(
                      "flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-0.5 text-[13px] font-semibold transition-colors sm:text-sm",
                      active
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-50",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ReadingTestsFilterSelects
            access={filters.access}
            sort={filters.sort}
            query={filters.query}
            testType={testType}
            onAccessChange={(value) => updateFilters({ access: value as PracticeCatalogFilters["access"] })}
            onSortChange={(value) => updateFilters({ sort: value as PracticeCatalogFilters["sort"] })}
            onQueryChange={(value) => updateFilters({ query: value })}
          />
        </section>

        <div className="mt-6">
          <PracticeCatalogTestsGrid
            tests={filteredTests}
            sort={filters.sort}
            source={filters.source}
            userAttempts={userAttempts}
          />
        </div>
        {filteredTests.length === 0 ? (
          <div className="mt-6 rounded-[14px] border border-slate-200 bg-white p-8 text-center shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{"No tests match these filters."}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{"Try another search, collection, passage, or access type."}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
