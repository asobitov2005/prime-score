"use client";

import { AlertCircle, Link, Part2LiveLoadingState, Part2LiveView, SpeakingResultSummary, SpeakingTopicItem, buildCueCardSpeechText, buildRepeatSpeakingHref, cn, createApiClient, normalizeSpeakingEntryMode, parseSpeakingTopicLabels, readSpeakingPrepNotes, resolveSpeakingQuestionsAnswered, useCallback, useEffect, useMemo, useRef, useSearchParams, useSpeakingLiveSession, useState, writeSpeakingPrepNotes } from "./part-2-live-client-dependencies";
import { SPEAKING_RESULT_VIEWPORT, findSpeakingTopic, normalizeAiMode, resolveCueCard, usePart2ViewPhase } from "./part-2-live-client-part-01";

export function Part2LiveClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
  const aiMode = normalizeAiMode(searchParams.get("aiMode"));
  const topics = useMemo(() => parseSpeakingTopicLabels(searchParams), [searchParams]);
  const topicLabel = topics[0] ?? searchParams.get("topic") ?? "Selected topic";
  const randomTopic = searchParams.get("randomTopic") !== "0";
  const api = useMemo(() => createApiClient(), []);
  const [connectionOnline, setConnectionOnline] = useState(true);
  const [topic, setTopic] = useState<SpeakingTopicItem | null>(null);
  const [notes, setNotes] = useState("");
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const live = useSpeakingLiveSession({
    sessionId,
    entryMode,
    aiMode,
    part: 2,
    topics,
    randomTopic,
  });

  const cueCard = useMemo(() => resolveCueCard(topic), [topic]);

  const viewPhase = usePart2ViewPhase(
    live.examinerTranscript,
    live.isInterviewStarted,
    cueCard,
  );

  useEffect(() => {
    setConnectionOnline(navigator.onLine);
    const handleOnline = () => setConnectionOnline(true);
    const handleOffline = () => setConnectionOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    setNotes(readSpeakingPrepNotes(sessionId));
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await api.listSpeakingTopics(2);
        if (!cancelled) {
          setTopic(findSpeakingTopic(payload.items, topics));
        }
      } catch {
        // Cue card fallback is handled in resolveCueCard.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, topics]);

  useEffect(() => {
    if (live.result) {
      document.documentElement.classList.remove("primescore-scroll-lock");
      return;
    }

    document.documentElement.classList.add("primescore-scroll-lock");

    return () => {
      document.documentElement.classList.remove("primescore-scroll-lock");
    };
  }, [live.result]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      speechRef.current = null;
    };
  }, []);

  const persistNotes = useCallback(
    (value: string) => {
      setNotes(value);
      if (sessionId) {
        writeSpeakingPrepNotes(sessionId, value);
      }
    },
    [sessionId],
  );

  const handleListenAgain = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(buildCueCardSpeechText(cueCard));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [cueCard]);

  const repeatHref = live.result
    ? buildRepeatSpeakingHref(live.result.speakingTestId, live.result.entryMode, aiMode, 2, topics, randomTopic)
    : "/speaking";

  const detailHref = useMemo(() => {
    if (!live.result) {
      return "/speaking";
    }
    const params = new URLSearchParams({
      aiMode,
      part: "2",
      randomTopic: randomTopic ? "1" : "0",
    });
    topics.forEach((topicTitle) => params.append("topics", topicTitle));
    return `/speaking/sessions/${live.result.sessionId}/result?${params.toString()}`;
  }, [aiMode, live.result, randomTopic, topics]);

  const handleEndTest = useCallback(() => {
    if (live.isDeletingSession || live.status === "finalizing") {
      return;
    }
    live.stop();
  }, [live]);

  if (!sessionId) {
    return (
      <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold text-amber-950">Speaking session is not ready</h1>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Start from the microphone check page so PrimeScore can create a backend AI session first.
        </p>
        <Link
          href="/speaking"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white"
        >
          Back to Speaking
        </Link>
      </div>
    );
  }

  if (entryMode !== "part_2") {
    return (
      <div className="rounded-[20px] border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This live page is only available for Part 2 practice.</span>
        </div>
      </div>
    );
  }

  if (live.result) {
    return (
      <div className={cn("w-full", SPEAKING_RESULT_VIEWPORT)}>
        <SpeakingResultSummary
          result={live.result}
          repeatHref={repeatHref}
          detailHref={detailHref}
          part={2}
          topics={topics}
          questionCount={resolveSpeakingQuestionsAnswered(live.result)}
        />
      </div>
    );
  }

  if (!live.isInterviewStarted) {
    return <Part2LiveLoadingState />;
  }

  return (
    <div className="flex min-h-0 max-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden overscroll-none lg:h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)] lg:max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)]">
      <Part2LiveView
        live={live}
        cueCard={cueCard}
        viewPhase={viewPhase}
        notes={notes}
        topicLabel={topicLabel}
        connectionOnline={connectionOnline}
        onNotesChange={persistNotes}
        onListenAgain={handleListenAgain}
        onEndTest={handleEndTest}
        endDisabled={live.isDeletingSession || live.status === "finalizing" || live.status === "closed"}
      />
    </div>
  );
}
