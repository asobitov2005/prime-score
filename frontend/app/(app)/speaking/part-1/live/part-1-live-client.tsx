"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  buildRepeatSpeakingHref,
  useSpeakingLiveSession,
} from "@/app/(app)/speaking/speaking-page-client";
import { Part1LiveLoadingState, Part1LiveView } from "@/components/speaking/part-1-live-view";
import { SpeakingResultSummary } from "@/components/speaking/speaking-result-summary";
import { normalizeSpeakingEntryMode, parseSpeakingTopicLabels } from "@/lib/speaking-navigation";
import { resolveSpeakingQuestionsAnswered } from "@/lib/speaking-result-utils";

const SPEAKING_RESULT_VIEWPORT =
  "max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-3rem)] overflow-y-auto overscroll-contain pr-1";

type SpeakingAiMode = "strict_exam" | "free_talk" | "uzbek_roast";

function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}

export function Part1LiveClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
  const aiMode = normalizeAiMode(searchParams.get("aiMode"));
  const topics = useMemo(() => parseSpeakingTopicLabels(searchParams), [searchParams]);
  const topicLabel = topics[0] ?? searchParams.get("topic") ?? "Work & Study";
  const randomTopic = searchParams.get("randomTopic") !== "0";
  const [connectionOnline, setConnectionOnline] = useState(true);

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

  const live = useSpeakingLiveSession({
    sessionId,
    entryMode,
    aiMode,
    part: 1,
    topics,
    randomTopic,
  });

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

  const repeatHref = live.result
    ? buildRepeatSpeakingHref(live.result.speakingTestId, live.result.entryMode, aiMode, 1, topics, randomTopic)
    : "/speaking";

  const detailHref = useMemo(() => {
    if (!live.result) {
      return "/speaking";
    }
    const params = new URLSearchParams({
      aiMode,
      part: "1",
      randomTopic: randomTopic ? "1" : "0",
    });
    topics.forEach((topic) => params.append("topics", topic));
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

  if (entryMode !== "part_1") {
    return (
      <div className="rounded-[20px] border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This live page is only available for Part 1 practice.</span>
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
          part={1}
          topics={topics}
          questionCount={resolveSpeakingQuestionsAnswered(live.result)}
        />
      </div>
    );
  }

  if (!live.isInterviewStarted) {
    return <Part1LiveLoadingState />;
  }

  return (
    <div className="flex min-h-0 max-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden overscroll-none lg:h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)] lg:max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)]">
      <Part1LiveView
        live={live}
        topicLabel={topicLabel}
        connectionOnline={connectionOnline}
        onEndTest={handleEndTest}
        endDisabled={live.isDeletingSession || live.status === "finalizing" || live.status === "closed"}
      />
    </div>
  );
}
