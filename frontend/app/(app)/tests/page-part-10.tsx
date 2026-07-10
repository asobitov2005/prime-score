import { ArrowRight, Button, CirclePlay, LatestTestsPanel, Link, PracticeCatalogView, TestsRefreshOnMount, cn, getCatalogTests, getTestSourceLabel, getUserAttempts } from "./page-dependencies";
import { TestsPageProps, collectionCards, skillCards, summaryCards } from "./page-part-01";
import { getCollectionTitle, getSkillCardButton, getSkillCardDescription, getSummaryTitle } from "./page-part-02";
import { normalizeActiveType } from "./page-part-04";
import { getContinueHref } from "./page-part-05";
import { CollectionImageTile, IconTile, formatDisplay } from "./page-part-06";
import { HeaderIllustration } from "./page-part-09";

export async function TestsPage({ searchParams }: TestsPageProps) {
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
