"use client";

import { AttemptRow, ChevronRight, Link, PracticeCatalogFilters, PracticeCatalogSource, PracticeCatalogType, ReadingTestsFilterSelects, TestCatalogItem, cn, filterPracticeCatalogTests, useMemo } from "./practice-catalog-view-dependencies";
import { CollectionImageTile, getCollectionTitle, listeningCollectionCards, listeningTabs, readingCollectionCards, readingTabs, usePracticeCatalogFilters } from "./practice-catalog-view-part-01";
import { PracticeCatalogTestsGrid } from "./practice-catalog-view-part-02";

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

        <section className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
          {collectionCards.map((card) => {
            const active = filters.source === card.source;
            return (
              <button
                key={card.title}
                type="button"
                onClick={() => updateFilters({ source: card.source as PracticeCatalogSource })}
                className={cn(
                  "group flex min-h-[6.25rem] items-center gap-4 rounded-[14px] border border-slate-200 bg-white p-4 text-left shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)] transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none dark:hover:border-slate-700",
                  active && activeCollectionClass,
                )}
              >
                <CollectionImageTile
                  src={card.imageSrc}
                  alt={card.imageAlt}
                  className={cn(active && activeCollectionIconClass)}
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
                  <span className="mt-1 block truncate text-sm text-slate-500 dark:text-slate-400">{card.subtitle}</span>
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400",
                    active && activeChevronClass,
                  )}
                />
              </button>
            );
          })}
        </section>

        <section className="mt-8 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] dark:border-slate-800 [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full items-end gap-x-6 gap-y-2">
              {formatTabs.map((tab) => {
                const active = filters.format === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => updateFilters({ format: tab.value })}
                    className={cn(
                      "flex h-10 shrink-0 items-center border-b-2 px-0.5 text-sm font-semibold transition-colors",
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
