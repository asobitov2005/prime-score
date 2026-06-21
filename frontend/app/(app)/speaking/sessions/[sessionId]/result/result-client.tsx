"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

import { SpeakingResultPanel, buildRepeatSpeakingHref } from "@/app/(app)/speaking/speaking-page-client";
import { createApiClient, type SpeakingSessionResult } from "@/lib/api/client";
import { parseSpeakingTopicLabels } from "@/lib/speaking-navigation";

type SpeakingAiMode = "strict_exam" | "free_talk" | "uzbek_roast";

function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}

export function SpeakingSessionResultClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useMemo(() => createApiClient(), []);
  const aiMode = normalizeAiMode(searchParams.get("aiMode"));
  const part = Number.parseInt(searchParams.get("part") ?? "1", 10) || 1;
  const topics = useMemo(() => parseSpeakingTopicLabels(searchParams), [searchParams]);
  const randomTopic = searchParams.get("randomTopic") !== "0";
  const [result, setResult] = useState<SpeakingSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void api
      .getSpeakingSessionResult(sessionId)
      .then((payload) => {
        if (!cancelled) {
          setResult(payload);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Could not load speaking result.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, sessionId]);

  const repeatHref = result
    ? buildRepeatSpeakingHref(result.speakingTestId, result.entryMode, aiMode, part, topics, randomTopic)
    : "/speaking";

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] border border-[#E5E7EB] bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
        <p className="mt-4 text-sm font-medium text-[#64748B]">Loading detailed feedback...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="rounded-[20px] border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? "Speaking result not found."}</span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/speaking")}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#0F172A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Speaking
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/speaking"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Speaking
      </Link>
      <SpeakingResultPanel result={result} repeatHref={repeatHref} />
    </div>
  );
}
