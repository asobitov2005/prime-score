"use client";

import { Check, Link, SpeakingAiSphere, SpeakingTestListItem, SpeakingTopicItem, buildMicrophoneCheckHref, buildRoastSpeakingHref, buildSpeakingTopicPickerHref, clampSpeakingPart, cn, createApiClient, isPartPracticeEntryMode, normalizeSpeakingEntryMode, parseSpeakingTopicLabels, useEffect, useMemo, useRef, useRouter, useSearchParams, useState } from "./dependencies";

import { SpeakingModeCardConfig, accentStyles, modeCards } from "./shared-part-01";

import { LiveSpeakingSessionView, RoastSpeakingShell } from "./shared-part-03";

import { prefetchMicrophonePermission } from "./shared-part-06";

import { normalizeAiMode } from "./shared-part-07";



export function SpeakingLaunchPanel({
  test,
  topics,
}: {
  test: SpeakingTestListItem | null;
  topics: SpeakingTopicItem[];
}) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem]">
          Speaking
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">
          Choose a speaking mode and simulate a real IELTS-style conversation with instant feedback.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {modeCards.map((card) => {
          const topic = topics.find((item) => item.partNumber === card.part) ?? null;
          const href = card.aiMode === "uzbek_roast"
            ? buildRoastSpeakingHref(test?.id ?? null)
            : isPartPracticeEntryMode(card.entryMode)
              ? buildSpeakingTopicPickerHref(card.part, test?.id ?? null)
              : buildMicrophoneCheckHref(card.entryMode, card.aiMode, card.part, test?.id ?? null, topic);

          return (
            <SpeakingModeCard
              key={card.id}
              card={card}
              href={href}
            />
          );
        })}
      </div>
    </section>
  );
}

export function SpeakingModeCard({
  card,
  href,
}: {
  card: SpeakingModeCardConfig;
  href: string;
}) {
  const Icon = card.icon;
  const visual = accentStyles[card.accent];
  const BadgeIcon = card.badge?.icon;

  return (
    <article
      className={cn(
        "relative flex min-h-[300px] flex-col rounded-[20px] border p-6 transition duration-200 hover:-translate-y-0.5 sm:min-h-[310px] sm:p-7",
        visual.border,
        visual.card,
        card.featured && "ring-1 ring-[#C4B5FD]/80 dark:ring-[#6D4CFF]/35",
      )}
    >
      {card.badge && BadgeIcon ? (
        <span
          className={cn(
            "pointer-events-none absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
            card.badge.tone === "purple"
              ? "bg-[#6D4CFF] text-white shadow-[0_10px_24px_-16px_rgba(109,76,255,0.95)]"
              : "border border-[#FED7AA] bg-[#FFF7ED] text-[#EA580C] dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
          )}
        >
          <BadgeIcon className={cn("h-3.5 w-3.5", card.badge.tone === "purple" && "fill-current")} strokeWidth={2.25} />
          {card.badge.label}
        </span>
      ) : null}

      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full shadow-[0_16px_34px_-24px_rgba(15,23,42,0.45)] sm:h-[84px] sm:w-[84px]",
            visual.icon,
          )}
        >
          <Icon className="h-8 w-8" strokeWidth={2} />
        </span>

        <h2 className="mt-5 text-[22px] font-bold leading-tight text-slate-950 dark:text-slate-50 sm:text-[24px]">
          {card.title}
        </h2>
      </div>

      <div className="my-5 h-px bg-slate-200 dark:bg-slate-800" />

      <ul className="flex-1 space-y-3 text-left">
        {card.bullets.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[14px] font-semibold leading-5 text-slate-700 dark:text-slate-300 sm:text-[15px]">
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", visual.check)}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        onPointerDown={card.aiMode === "uzbek_roast" ? prefetchMicrophonePermission : undefined}
        className={cn(
          "mt-6 inline-flex h-11 w-full shrink-0 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition active:scale-[0.99]",
          visual.button,
        )}
      >
        {card.action}
      </Link>
    </article>
  );
}

export function LiveSpeakingMockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("sessionId");
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
  const part = clampSpeakingPart(Number(searchParams.get("part") ?? (entryMode === "full" ? "1" : entryMode.replace("part_", ""))));
  const topic = searchParams.get("topic");
  const topics = useMemo(() => parseSpeakingTopicLabels(searchParams), [searchParams]);
  const topicLabel = topics.length > 0 ? topics.join(", ") : topic;
  const randomTopic = searchParams.get("randomTopic") !== "0";
  const aiMode = normalizeAiMode(searchParams.get("aiMode"));
  const prepComplete = searchParams.get("prepComplete") === "1";
  const isRoastMode = aiMode === "uzbek_roast";
  const api = useMemo(() => createApiClient(), []);
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(sessionIdFromUrl);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(isRoastMode && !sessionIdFromUrl);
  const roastBootstrapStartedRef = useRef(false);

  useEffect(() => {
    setResolvedSessionId(sessionIdFromUrl);
  }, [sessionIdFromUrl]);

  useEffect(() => {
    if (!isRoastMode || sessionIdFromUrl) {
      roastBootstrapStartedRef.current = false;
      return;
    }
    if (roastBootstrapStartedRef.current) {
      return;
    }
    roastBootstrapStartedRef.current = true;

    let cancelled = false;
    setIsBootstrapping(true);
    setBootstrapError(null);

    void (async () => {
      try {
        const requestedTestId = searchParams.get("testId");
        const speakingTestId = requestedTestId ?? (await api.listSpeakingTests()).items[0]?.id ?? null;
        if (!speakingTestId) {
          throw new Error("Could not find a speaking test.");
        }
        const session = await api.createSpeakingSession(speakingTestId, entryMode);
        if (cancelled) {
          return;
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set("sessionId", session.sessionId);
        params.set("testId", session.speakingTestId);
        router.replace(`/speaking?${params.toString()}`);
        setResolvedSessionId(session.sessionId);
      } catch (bootstrapFailure) {
        if (!cancelled) {
          setBootstrapError(
            bootstrapFailure instanceof Error
              ? bootstrapFailure.message
              : "Could not start the roast session.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, entryMode, isRoastMode, router, searchParams, sessionIdFromUrl]);

  if (isRoastMode && (isBootstrapping || !resolvedSessionId)) {
    return (
      <RoastSpeakingShell>
        {bootstrapError ? (
          <section className="mx-auto max-w-md rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {bootstrapError}
          </section>
        ) : (
          <>
            <SpeakingAiSphere state="connecting" />
            <p className="mt-8 text-sm font-semibold text-slate-600 dark:text-slate-300">Preparing session...</p>
          </>
        )}
      </RoastSpeakingShell>
    );
  }

  if (!resolvedSessionId) {
    return (
      <main className="speaking-night animate-in fade-in duration-500 text-slate-950 dark:text-slate-50">
        <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h1 className="text-xl font-semibold text-amber-950 dark:text-amber-100">Speaking session is not ready</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-amber-800 dark:text-amber-200/90">
            Start from the microphone check page so PrimeScore can create a backend AI session first.
          </p>
          <Link href="/speaking" className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white">
            Back to Speaking
          </Link>
        </section>
      </main>
    );
  }

  return (
    <LiveSpeakingSessionView
      sessionId={resolvedSessionId}
      entryMode={entryMode}
      aiMode={aiMode}
      part={part}
      topics={topics}
      topicLabel={topicLabel}
      randomTopic={randomTopic}
      isRoastMode={isRoastMode}
      prepComplete={prepComplete}
    />
  );
}
