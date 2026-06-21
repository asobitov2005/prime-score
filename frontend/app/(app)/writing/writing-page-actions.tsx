"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CloudDownload, FileText, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { emitNavigationStart } from "@/lib/navigation-transition";
import { cn } from "@/lib/utils";
import type { WritingLimitStatus, WritingTaskListItem, WritingTaskType } from "@/lib/server-writing";
import { CustomTaskDialog } from "./custom-task-card";
import { WritingLimitTrigger } from "./writing-limit-gate";

export function CheckEssayButton({
  activeTaskType,
  limitStatus,
  className,
}: {
  activeTaskType: WritingTaskType;
  limitStatus: WritingLimitStatus | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <WritingLimitTrigger
        limitStatus={limitStatus}
        onAllowedClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:text-white dark:shadow-none dark:focus-visible:ring-offset-slate-950",
          className,
        )}
      >
        <CloudDownload className="h-4 w-4" />
        Check My Essay
      </WritingLimitTrigger>
      <CustomTaskDialog taskType={activeTaskType} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ScrollToPromptsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => document.getElementById("prompt-library")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none dark:hover:border-orange-500/35 dark:hover:bg-orange-500/10 dark:focus-visible:ring-offset-slate-950",
        className,
      )}
    >
      <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      Choose a Prompt
    </button>
  );
}

export function RandomPromptButton({
  tasks,
  limitStatus,
  className,
  variant = "default",
}: {
  tasks: WritingTaskListItem[];
  limitStatus: WritingLimitStatus | null;
  className?: string;
  variant?: "default" | "cta";
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const handleRandomPrompt = () => {
    if (tasks.length === 0) {
      setMessage("No prompts found for this filter.");
      return;
    }

    setMessage(null);
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    const href = `/exam-preview/writing?taskId=${task.id}`;
    emitNavigationStart(href);
    router.push(href);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <WritingLimitTrigger
        limitStatus={limitStatus}
        onAllowedClick={handleRandomPrompt}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none dark:hover:border-orange-500/35 dark:hover:bg-orange-500/10 dark:focus-visible:ring-offset-slate-950",
          variant === "cta" && "w-full sm:w-auto",
        )}
      >
        <Shuffle className="h-4 w-4 text-orange-500" />
        Random Prompt
      </WritingLimitTrigger>
      {message ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{message}</p>
      ) : null}
    </div>
  );
}

export function ResetFiltersButton({ href }: { href: string }) {
  return (
    <Button asChild className="h-10 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600">
      <a href={href}>
        Reset filters
        <ArrowRight className="h-4 w-4" />
      </a>
    </Button>
  );
}
