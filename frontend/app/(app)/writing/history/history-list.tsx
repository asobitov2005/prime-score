"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, FileText, Loader2, PenSquare } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getWritingDraftClient, getWritingDraftsClient } from "@/lib/client-writing";
import type { WritingDraftListItem, WritingHistoryItem, WritingTaskType } from "@/lib/server-writing";
import { cn } from "@/lib/utils";
import { DraftRow } from "./draft-row";

interface WritingLocalDraftRecord {
  topic?: string;
  essay?: string;
  imageDataUrl?: string | null;
  started?: boolean;
  timeSpentSeconds?: number;
  updatedAt?: string;
}

interface WritingHistoryListProps {
  initialDrafts: WritingDraftListItem[];
  historyItems: WritingHistoryItem[];
  filter: WritingTaskType | null;
}

function exactDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function bandTone(band: number) {
  if (band >= 8) return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30";
  if (band >= 7) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (band >= 6) return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (band >= 5) return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
}

function draftWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function isWritingDraftStorageKey(key: string | null): key is string {
  return Boolean(key?.startsWith("writing-exam-draft:"));
}

function inferTaskId(draftKey: string): string | null {
  if (!draftKey.startsWith("writing-exam-draft:") || draftKey.startsWith("writing-exam-draft:custom:")) {
    return null;
  }
  return draftKey.replace("writing-exam-draft:", "") || null;
}

function inferTaskType(draftKey: string, remoteDraft: WritingDraftListItem | null, filter: WritingTaskType | null): WritingTaskType {
  if (remoteDraft?.task_type) {
    return remoteDraft.task_type;
  }
  if (draftKey.startsWith("writing-exam-draft:custom:task_1")) {
    return "task_1";
  }
  if (draftKey.startsWith("writing-exam-draft:custom:task_2")) {
    return "task_2";
  }
  return filter ?? "task_2";
}

function normalizeUpdatedAt(value: unknown): string {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
}

function mergeDrafts(drafts: WritingDraftListItem[]): WritingDraftListItem[] {
  const byKey = new Map<string, WritingDraftListItem>();
  for (const draft of drafts) {
    if (draftWordCount(draft.essay_text) < 20) {
      continue;
    }
    const existing = byKey.get(draft.draft_key);
    if (!existing || new Date(draft.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
      byKey.set(draft.draft_key, draft);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

async function readLocalDrafts(
  remoteDrafts: WritingDraftListItem[],
  filter: WritingTaskType | null,
): Promise<WritingDraftListItem[]> {
  const remoteByKey = new Map(remoteDrafts.map((draft) => [draft.draft_key, draft]));
  const drafts: WritingDraftListItem[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const draftKey = window.localStorage.key(index);
    if (!isWritingDraftStorageKey(draftKey)) {
      continue;
    }

    let localDraft: WritingLocalDraftRecord;
    try {
      localDraft = JSON.parse(window.localStorage.getItem(draftKey) || "{}") as WritingLocalDraftRecord;
    } catch {
      continue;
    }

    const essayText = typeof localDraft.essay === "string" ? localDraft.essay : "";
    if (draftWordCount(essayText) < 20) {
      continue;
    }

    const listedRemoteDraft = remoteByKey.get(draftKey) ?? null;
    const remoteDraft = listedRemoteDraft ?? await getWritingDraftClient(draftKey).catch(() => null);
    drafts.push({
      draft_key: draftKey,
      task_id: remoteDraft?.task_id ?? inferTaskId(draftKey),
      task_type: inferTaskType(draftKey, remoteDraft, filter),
      task_title: listedRemoteDraft?.task_title ?? null,
      topic: typeof localDraft.topic === "string" ? localDraft.topic : remoteDraft?.topic ?? "",
      essay_text: essayText || remoteDraft?.essay_text || "",
      image_data_url: localDraft.imageDataUrl ?? remoteDraft?.image_data_url ?? null,
      started: Boolean(localDraft.started ?? remoteDraft?.started ?? true),
      time_spent_seconds: Number(localDraft.timeSpentSeconds ?? remoteDraft?.time_spent_seconds ?? 0),
      updated_at: normalizeUpdatedAt(localDraft.updatedAt ?? remoteDraft?.updated_at),
    });
  }

  return drafts;
}

function HistoryRow({ item }: { item: WritingHistoryItem }) {
  const status = String(item.status ?? "").toLowerCase();
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isPending = !isCompleted && !isFailed;
  const band =
    item.overall_band !== null && item.overall_band !== undefined
      ? typeof item.overall_band === "string"
        ? parseFloat(item.overall_band)
        : item.overall_band
      : null;

  return (
    <Link href={`/writing/submissions/${item.submission_id}/result`} className="block group">
      <Card className="rounded-2xl border-border/60 bg-card/40 hover:border-violet-500/40 hover:bg-card/60 transition-colors">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <PenSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold truncate">{item.task_title}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {item.word_count} words
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" /> {formatDuration(item.time_spent_seconds)}
                </span>
                <span>·</span>
                <span>{exactDateTime(item.submitted_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isPending ? (
              <span className="inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                Grading...
              </span>
            ) : isFailed ? (
              <span className="whitespace-nowrap rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-300">
                Failed
              </span>
            ) : band !== null ? (
              <span
                className={cn(
                  "inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                  bandTone(band),
                )}
              >
                Band {band.toFixed(1)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No score</span>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function WritingHistoryList({ initialDrafts, historyItems, filter }: WritingHistoryListProps) {
  const [drafts, setDrafts] = useState(() => mergeDrafts(initialDrafts));

  useEffect(() => {
    let cancelled = false;

    async function loadDrafts() {
      const remoteDrafts = await getWritingDraftsClient()
        .then((response) => response.items)
        .catch(() => initialDrafts);
      const localDrafts = await readLocalDrafts(remoteDrafts, filter);
      if (!cancelled) {
        setDrafts(mergeDrafts([...remoteDrafts, ...localDrafts]));
      }
    }

    void loadDrafts();
    return () => {
      cancelled = true;
    };
  }, [filter, initialDrafts]);

  const visibleDrafts = useMemo(
    () => (filter ? drafts.filter((draft) => draft.task_type === filter) : drafts),
    [drafts, filter],
  );

  if (visibleDrafts.length === 0 && historyItems.length === 0) {
    return (
      <EmptyState
        icon="pen"
        title="No essays yet"
        description="Submit your first IELTS Writing essay to get instant AI feedback."
        action={{ href: "/writing", label: "Start writing" }}
        className="border-dashed bg-card/30"
      />
    );
  }

  return (
    <div className="space-y-3">
      {visibleDrafts.map((draft) => (
        <DraftRow key={draft.draft_key} draft={draft} />
      ))}
      {historyItems.map((item) => (
        <HistoryRow key={item.submission_id} item={item} />
      ))}
    </div>
  );
}
