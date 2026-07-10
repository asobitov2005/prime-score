"use client";

import { AttemptRow, BookmarkToggleButton, PracticeCatalogFilters, PracticeCatalogSource, StartTestModal, TestCatalogItem, cn, formatCatalogTestFormat, getCatalogActionButtonClassName, getCatalogBookmarkItem, getCatalogCardTitleClassName, getCatalogCardTitleDisplay, getCatalogCompletedScoreLabel, isCompletedCatalogAttempt, isNewTestCreatedAt, sortCatalogTests, splitCatalogTestsForDisplay, toCatalogAttemptSummary } from "./practice-catalog-view-dependencies";
import { CompletedBadge, NewTestBadge } from "./practice-catalog-view-part-01";

export function PracticeCatalogTestCard({
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

export function PracticeCatalogTestsGrid({
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
