"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Clock3, FileText, Loader2, RotateCcw, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { deleteWritingDraftClient } from "@/lib/client-writing";
import type { WritingDraftListItem } from "@/lib/server-writing";

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

function draftWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
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

export function DraftRow({ draft }: { draft: WritingDraftListItem }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const href = draft.task_id
    ? `/exam-preview/writing?taskId=${draft.task_id}`
    : `/exam-preview/writing?task_type=${draft.task_type}&draft_key=${encodeURIComponent(draft.draft_key)}`;
  const preview = draft.topic.trim() || draft.task_title || draft.essay_text.trim().slice(0, 120) || "Untitled draft";
  const words = draftWordCount(draft.essay_text);

  async function deleteDraft() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      try {
        window.localStorage.removeItem(draft.draft_key);
      } catch {}
      await deleteWritingDraftClient(draft.draft_key);
      setIsDeleted(true);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  if (isDeleted) return null;

  return (
    <Card className="rounded-2xl border-border/60 bg-card/40 transition-colors hover:border-violet-500/40 hover:bg-card/60">
      <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <Link href={href} className="group flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="max-w-full truncate font-semibold">{preview}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> {words} words
              </span>
              <span>.</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" /> {formatDuration(draft.time_spent_seconds)}
              </span>
              <span>.</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" /> {exactDateTime(draft.updated_at)}
              </span>
            </div>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            In progress
          </span>
          <button
            type="button"
            onClick={() => void deleteDraft()}
            disabled={isDeleting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Delete draft"
            title="Delete draft"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
          <Link href={href} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Resume draft">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
