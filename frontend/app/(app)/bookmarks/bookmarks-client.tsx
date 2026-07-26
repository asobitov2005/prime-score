"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { BookmarkCheck, ChevronRight, Lock, SearchCheck } from "lucide-react";

import { BookmarkToggleButton } from "@/components/bookmark-toggle-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTestSourceLabel } from "@/lib/test-source";
import type { TestCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useBookmarksStore } from "@/store/bookmarks-store";

interface BookmarksClientProps {
  catalogTests: TestCatalogItem[];
}

/** A catalog test the user has bookmarked, plus when they saved it. */
type BookmarkView = TestCatalogItem & { savedAt: string };

function formatDisplay(format: TestCatalogItem["format"], type: TestCatalogItem["type"]) {
  if (!format || format === "full") {
    return "Full Test";
  }

  const label = format
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return type === "listening" ? label.replace("Part", "Section") : label;
}

function formatSkill(type: TestCatalogItem["type"]) {
  return type.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSavedAt(savedAt: string) {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return "Saved";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function BookmarkSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="relative flex min-h-[12.75rem] flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none"
        >
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(249,115,22,0.08),transparent)] [animation:prime-skeleton-shimmer_1.9s_ease-in-out_infinite]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="mt-4 h-4 w-11/12 rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="mt-2 h-4 w-2/3 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="relative mt-4 h-3 w-44 max-w-full rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="relative mt-4 h-3 w-28 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="relative mt-auto h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export function BookmarksClient({ catalogTests }: BookmarksClientProps) {
  const userId = useAuthStore((state) => state.userId);
  const entries = useBookmarksStore((state) => state.entries);
  const hasHydrated = useBookmarksStore((state) => state.hasHydrated);
  const ensureHydrated = useBookmarksStore((state) => state.ensureHydrated);

  useEffect(() => {
    void ensureHydrated(userId);
  }, [ensureHydrated, userId]);

  const catalogById = useMemo(() => new Map(catalogTests.map((test) => [test.id, test])), [catalogTests]);
  const bookmarks = useMemo<BookmarkView[]>(
    () =>
      Object.entries(entries)
        .map(([testId, savedAt]) => {
          const test = catalogById.get(testId);
          return test ? { ...test, savedAt } : null;
        })
        .filter((item): item is BookmarkView => item !== null)
        .sort((left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime()),
    [catalogById, entries],
  );

  return (
    <div className="bg-[#F8FAFC] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-[82rem] pb-10">
        <section className="pt-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Link href="/tests" className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              Practice Tests
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700" />
            <span className="text-slate-800 dark:text-slate-200">Bookmarks</span>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem]">
                Bookmarks
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">
                Keep important IELTS tests in one place and continue them later.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:shadow-none">
              <BookmarkCheck className="h-4 w-4 text-orange-500" />
              {bookmarks.length} saved
            </div>
          </div>
        </section>

        <section className="mt-8">
          {!hasHydrated ? (
            <BookmarkSkeleton />
          ) : bookmarks.length === 0 ? (
            <EmptyState
              title="No bookmarked tests yet"
              description="Save reading or listening tests from the catalog and they will appear here."
              action={{ href: "/tests", label: "Browse Tests" }}
              icon="book"
              className="border border-dashed border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bookmarks.map((item) => {
                const isPremium = item.accessType === "premium";
                const actionLabel = isPremium ? "Unlock" : "Open Test";
                const href = `/tests/${item.slug || item.id}`;
                return (
                  <article
                    key={item.id}
                    className="relative flex min-h-[12.75rem] flex-col rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)] transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none dark:hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ring-1",
                              item.type === "reading"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25"
                                : item.type === "listening"
                                  ? "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25"
                                  : "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25",
                            )}
                          >
                            {formatSkill(item.type)}
                          </span>
                          {isPremium ? (
                            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-orange-50 px-2.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/25">
                              <Lock className="h-3 w-3" />
                              Premium
                            </span>
                          ) : (
                            <span className="inline-flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25">
                              Free
                            </span>
                          )}
                        </div>
                        <h2 className="mt-4 line-clamp-2 pr-2 text-[15px] font-semibold leading-snug text-slate-950 dark:text-slate-50">
                          {item.title}
                        </h2>
                      </div>
                      <BookmarkToggleButton item={item} className="h-9 w-9" iconClassName="h-4 w-4" />
                    </div>

                    <p className="mt-2 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
                      {getTestSourceLabel(item.source)} · {formatDisplay(item.format, item.type)}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      <SearchCheck className="h-3.5 w-3.5" />
                      Saved {formatSavedAt(item.savedAt)}
                    </div>

                    <Button
                      asChild
                      className={cn(
                        "mt-auto h-10 w-full rounded-lg text-sm font-semibold shadow-none",
                        actionLabel === "Unlock"
                          ? "border border-orange-200 bg-white text-orange-600 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-slate-950/40 dark:text-orange-300 dark:hover:bg-orange-500/10"
                          : "border border-orange-500 bg-orange-500 text-white hover:bg-orange-600",
                      )}
                    >
                      <Link href={href}>{actionLabel}</Link>
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
