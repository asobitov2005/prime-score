"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Headset,
  Lock,
  NotepadText,
  Pencil,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { BookmarkToggleButton } from "@/components/bookmark-toggle-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StartTestModal } from "@/components/start-test-modal";
import { getTestSourceLabel } from "@/lib/test-source";
import type { AttemptRow, TestCardAttemptSummary, TestCatalogItem, TestType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type LatestTestFilter = "all" | TestType | "speaking" | "mock";

interface LatestTestsPanelProps {
  tests: TestCatalogItem[];
  attempts: AttemptRow[];
  initialFilter: LatestTestFilter;
}

const latestTestFilters: Array<{ id: LatestTestFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Speaking" },
  { id: "mock", label: "Mock" },
];

const latestSkillOrder: TestType[] = ["reading", "listening", "writing"];
const latestTestsLimit = 4;
const latestTestsTableGridClassName =
  "grid-cols-[minmax(18rem,1.8fr)_minmax(9rem,0.8fr)_6rem_7rem_8rem_3rem]";
const latestActionButtonBaseClassName =
  "h-10 min-w-28 rounded-xl px-4 text-sm font-semibold shadow-none";
const latestActionButtonOutlineClassName =
  "h-10 min-w-28 rounded-xl border border-orange-200 bg-orange-50/80 px-4 text-sm font-semibold text-orange-700 shadow-none hover:border-orange-300 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:border-orange-400/35 dark:hover:bg-orange-500/15 dark:hover:text-orange-200";
const latestActionButtonSolidClassName =
  "h-10 min-w-28 rounded-xl border border-orange-300 bg-orange-100 px-4 text-sm font-semibold text-orange-700 shadow-none hover:border-orange-400 hover:bg-orange-200 hover:text-orange-800 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:border-orange-500/45 dark:hover:bg-orange-500/22 dark:hover:text-orange-100";

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

function isCompletedAttempt(attempt: TestCardAttemptSummary | undefined) {
  return attempt?.status === "completed" || attempt?.status === "submitted";
}

function getAttemptStatus(attempt: TestCardAttemptSummary | undefined) {
  if (!attempt) {
    return {
      label: "Not started",
      icon: PlayCircle,
      className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  if (isCompletedAttempt(attempt)) {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }

  return {
    label: "In progress",
    icon: RotateCcw,
    className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300",
  };
}

function formatDisplay(test: TestCatalogItem) {
  if (!test.format || test.format === "full") {
    return "Full Test";
  }

  const label = test.format
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return test.type === "listening" ? label.replace("Part", "Section") : label;
}

function getSkillStyles(type: TestCatalogItem["type"]) {
  if (type === "listening") {
    return {
      icon: Headset,
      tileClassName: "border-sky-100 bg-sky-50 text-sky-700 shadow-sky-100/70 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:shadow-none",
    };
  }

  if (type === "writing") {
    return {
      icon: Pencil,
      tileClassName: "border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300 dark:shadow-none",
    };
  }

  return {
    icon: NotepadText,
    tileClassName: "border-teal-100 bg-teal-50 text-teal-700 shadow-teal-100/70 dark:border-teal-500/25 dark:bg-teal-500/10 dark:text-teal-300 dark:shadow-none",
  };
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

function testMatchesFilter(test: TestCatalogItem, filter: LatestTestFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "mock") {
    return `${test.title} ${test.source} ${test.sourceDetail} ${test.description} ${test.tags.join(" ")}`
      .toLowerCase()
      .includes("mock");
  }

  if (filter === "speaking") {
    return false;
  }

  return test.type === filter;
}

function getTestCreatedTime(test: TestCatalogItem) {
  const time = new Date(test.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getBalancedLatestTests(tests: TestCatalogItem[], limit: number) {
  const testsBySkill = new Map<TestType, TestCatalogItem[]>();

  for (const skill of latestSkillOrder) {
    testsBySkill.set(skill, []);
  }

  for (const test of tests) {
    testsBySkill.get(test.type)?.push(test);
  }

  for (const skillTests of testsBySkill.values()) {
    skillTests.sort((first, second) => getTestCreatedTime(second) - getTestCreatedTime(first));
  }

  const selected = new Map<string, TestCatalogItem>();

  for (const skill of latestSkillOrder) {
    const latestSkillTest = testsBySkill.get(skill)?.[0];

    if (latestSkillTest) {
      selected.set(latestSkillTest.id, latestSkillTest);
    }
  }

  const remainingLatestTests = [...tests]
    .filter((test) => !selected.has(test.id))
    .sort((first, second) => getTestCreatedTime(second) - getTestCreatedTime(first));

  for (const test of remainingLatestTests) {
    if (selected.size >= limit) {
      break;
    }

    selected.set(test.id, test);
  }

  return [...selected.values()]
    .sort((first, second) => getTestCreatedTime(second) - getTestCreatedTime(first))
    .slice(0, limit);
}

function getTestBookmarkItem(test: TestCatalogItem) {
  return {
    id: test.id,
    slug: test.slug,
    title: test.title,
    type: test.type,
    format: test.format,
    accessType: test.accessType,
    source: test.source,
    sourceLabel: getTestSourceLabel(test.source),
    description: test.description,
    questionCount: test.questionCount,
    estimatedMinutes: test.estimatedMinutes,
    href: test.type === "writing" ? "/writing" : `/tests/${test.slug || test.id}`,
    actionLabel: test.accessType === "premium" ? "Unlock" : "Open Test",
  };
}

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
