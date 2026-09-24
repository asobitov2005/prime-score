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
          className="relative flex min-h-[12.75rem] flex-col overflow-hidden rounded-lg border border-border bg-card p-5"
        >
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-20 rounded-full bg-muted" />
                <div className="h-6 w-16 rounded-full bg-muted" />
              </div>
              <div className="mt-4 h-4 w-11/12 rounded-full bg-muted" />
              <div className="mt-2 h-4 w-2/3 rounded-full bg-muted" />
            </div>
            <div className="h-9 w-9 rounded-lg bg-muted" />
          </div>
          <div className="relative mt-4 h-3 w-44 max-w-full rounded-full bg-muted" />
          <div className="relative mt-4 h-3 w-28 rounded-full bg-muted" />
          <div className="relative mt-auto h-10 rounded-lg bg-muted" />
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
    <div className="bg-background text-foreground">
      <div className="mx-auto w-full max-w-[82rem] pb-10">
        <section className="pt-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Link href="/tests" className="text-muted-foreground transition-colors hover:text-foreground">
              Practice Tests
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground">Bookmarks</span>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-[1.85rem]">
                Bookmarks
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
                Keep important IELTS tests in one place and continue them later.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
              <BookmarkCheck className="h-4 w-4 text-primary" />
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
              className="border border-dashed border-border bg-card"
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
                    className="relative flex min-h-[12.75rem] flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex h-6 items-center rounded-md bg-muted px-2.5 text-xs font-semibold text-foreground ring-1 ring-border"
                          >
                            {formatSkill(item.type)}
                          </span>
                          {isPremium ? (
                            <span className="inline-flex h-6 items-center gap-1 rounded-md bg-accent px-2.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                              <Lock className="h-3 w-3" />
                              Premium
                            </span>
                          ) : (
                            <span className="inline-flex h-6 items-center rounded-md bg-muted px-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                              Free
                            </span>
                          )}
                        </div>
                        <h2 className="mt-4 line-clamp-2 pr-2 text-[15px] font-semibold leading-snug text-foreground">
                          {item.title}
                        </h2>
                      </div>
                      <BookmarkToggleButton item={item} className="h-9 w-9" iconClassName="h-4 w-4" />
                    </div>

                    <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                      {getTestSourceLabel(item.source)} · {formatDisplay(item.format, item.type)}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <SearchCheck className="h-3.5 w-3.5" />
                      Saved {formatSavedAt(item.savedAt)}
                    </div>

                    <Button
                      asChild
                      className={cn(
                        "mt-auto h-10 w-full rounded-lg text-sm font-semibold shadow-none",
                        actionLabel === "Unlock"
                          ? "border border-primary/30 bg-card text-primary hover:border-primary/50 hover:bg-accent"
                          : "bg-primary text-primary-foreground hover:bg-primary/90",
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
