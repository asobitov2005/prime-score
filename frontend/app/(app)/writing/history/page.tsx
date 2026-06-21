import Link from "next/link";
import { ArrowRight, PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getWritingDrafts,
  getWritingHistory,
  type WritingDraftListItem,
} from "@/lib/server-writing";
import { WritingHistoryList } from "./history-list";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { task_type?: string };
}

function draftWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default async function WritingHistoryPage({ searchParams }: PageProps) {
  const filter = searchParams?.task_type === "task_1" || searchParams?.task_type === "task_2"
    ? searchParams.task_type
    : null;

  const [history, draftList] = await Promise.all([
    getWritingHistory().catch(() => ({ items: [], total: 0 })),
    getWritingDrafts().catch(() => ({ items: [] as WritingDraftListItem[] })),
  ]);
  const items = filter ? history.items.filter((i) => i.task_type === filter) : history.items;
  const visibleDrafts = draftList.items.filter((draft) => draftWordCount(draft.essay_text) >= 20);

  return (
    <div className="mx-auto w-full max-w-[82rem] space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[1.85rem]">Your essays</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every essay you've submitted with its AI band score and feedback.
          </p>
        </div>
        <Button asChild className="h-11 rounded-2xl px-5 font-semibold shadow-sm shadow-primary/20">
          <Link href="/writing">
            <PenSquare className="h-4 w-4" />
            New essay
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/writing/history"
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            !filter
              ? "border-foreground/40 bg-foreground text-background"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
          )}
        >
          All ({history.items.length + visibleDrafts.length})
        </Link>
        <Link
          href="/writing/history?task_type=task_1"
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            filter === "task_1"
              ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
          )}
        >
          Task 1
        </Link>
        <Link
          href="/writing/history?task_type=task_2"
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            filter === "task_2"
              ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
          )}
        >
          Task 2
        </Link>
      </div>

      <WritingHistoryList
        initialDrafts={visibleDrafts}
        historyItems={items}
        filter={filter}
      />
    </div>
  );
}
