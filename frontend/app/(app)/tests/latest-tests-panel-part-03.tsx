"use client";

import { Badge, BookmarkToggleButton, Button, ClipboardCheck, EmptyState, Link, Lock, StartTestModal, TestCardAttemptSummary, cn, getTestSourceLabel, useEffect, useMemo, useState } from "./latest-tests-panel-dependencies";
import { IconTile, LatestTestFilter, LatestTestsPanelProps, formatDisplay, getAttemptStatus, getSkillStyles, isCompletedAttempt, latestActionButtonBaseClassName, latestActionButtonOutlineClassName, latestActionButtonSolidClassName, latestTestFilters, latestTestsLimit, latestTestsTableGridClassName, testMatchesFilter, toCardAttemptSummary } from "./latest-tests-panel-part-01";
import { getBalancedLatestTests, getTestBookmarkItem } from "./latest-tests-panel-part-02";

export function LatestTestsPanel({ tests, attempts, initialFilter }: LatestTestsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<LatestTestFilter>(initialFilter);

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  const latestAttemptByTestId = useMemo(() => {
    const attemptsByTestId = new Map<string, TestCardAttemptSummary>();
    for (const attempt of attempts) {
      if (!attemptsByTestId.has(attempt.testId)) {
        attemptsByTestId.set(attempt.testId, toCardAttemptSummary(attempt));
      }
    }
    return attemptsByTestId;
  }, [attempts]);

  const latestTests = useMemo(() => {
    const matchingTests = tests.filter((test) => testMatchesFilter(test, activeFilter));

    if (activeFilter === "all") {
      return getBalancedLatestTests(matchingTests, latestTestsLimit);
    }

    return matchingTests.slice(0, latestTestsLimit);
  }, [activeFilter, tests]);

  return (
    <section id="latest-tests" className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">Latest Tests</h2>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_22px_-20px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex justify-start">
            <div className="flex gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
              {latestTestFilters.map((tab) => {
                const active = activeFilter === tab.id;
                return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
                    active
                      ? "border-slate-300 bg-white text-slate-950 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:ring-slate-700/40"
                      : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                  )}
                  aria-pressed={active}
                >
                  {tab.label}
                </button>
              );
            })}
            </div>
          </div>
        </div>

        <div className={cn("hidden gap-4 border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400 xl:grid xl:items-center", latestTestsTableGridClassName)}>
          <span>Test</span>
          <span>Type</span>
          <span className="justify-self-center text-center">Questions</span>
          <span>Access</span>
          <span className="w-full text-center">Action</span>
          <span />
        </div>

        {latestTests.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No tests found"
              description="Choose another skill filter."
              className="border border-dashed border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60"
              compact
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {latestTests.map((test) => {
            const skill = getSkillStyles(test.type);
            const Icon = skill.icon;
            const canStartTest = test.type === "reading" || test.type === "listening";
            const latestAttempt = latestAttemptByTestId.get(test.id);
            const activeAttempt = latestAttempt?.status === "in_progress" ? latestAttempt : undefined;
            const completedAttempt = isCompletedAttempt(latestAttempt) ? latestAttempt : undefined;
            const status = getAttemptStatus(latestAttempt);
            const StatusIcon = status.icon;
            const actionButtonClassName = cn(
              latestActionButtonBaseClassName,
              activeAttempt || completedAttempt ? latestActionButtonSolidClassName : latestActionButtonOutlineClassName,
            );

            return (
              <article key={test.id} className={cn("grid gap-4 px-4 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 sm:px-5 xl:items-center", latestTestsTableGridClassName)}>
                <div className="flex min-w-0 items-start gap-3">
                  <IconTile icon={Icon} className={skill.tileClassName} />
                  <div className="min-w-0">
                    <Link href={`/tests/${test.slug || test.id}`} className="line-clamp-2 text-base font-semibold leading-6 text-slate-950 hover:text-orange-700 dark:text-slate-50 dark:hover:text-orange-300">
                      {test.title}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{getTestSourceLabel(test.source)}</p>
                  </div>
                </div>

                <div>
                  <Badge className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {formatDisplay(test)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 xl:justify-self-center">
                  <ClipboardCheck className="h-4 w-4 text-slate-400 dark:text-slate-500 xl:hidden" />
                  {test.questionCount}
                </div>

                <div>
                  {test.accessType === "premium" ? (
                    <Badge className="gap-1.5 border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300">
                      <Lock className="h-3.5 w-3.5" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge className="border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Free
                    </Badge>
                  )}
                  <Badge className={cn("mt-2 gap-1.5 border px-2.5 py-1 text-xs font-semibold xl:hidden", status.className)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </Badge>
                </div>

                <div className="w-full">
                  {canStartTest ? (
                    <StartTestModal
                      test={test}
                      activeAttempt={activeAttempt}
                      completedAttempt={completedAttempt}
                      compactAction
                      unlockLabel="Unlock"
                      startLabel="Start Test"
                      continueLabel="Continue"
                      reviewLabel="Review"
                      buttonClassName={actionButtonClassName}
                    />
                  ) : (
                    <Button asChild className={actionButtonClassName}>
                      <Link href="/writing">Open</Link>
                    </Button>
                  )}
                </div>

                <BookmarkToggleButton item={getTestBookmarkItem(test)} />
              </article>
            );
          })}
        </div>
      )}
      </div>
    </section>
  );
}
