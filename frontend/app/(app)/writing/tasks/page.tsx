import Link from "next/link";
import { ArrowRight, Clock3, ImageIcon, PenSquare, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  listWritingTasks,
  resolveWritingAssetUrl,
  type WritingTaskListItem,
  type WritingTaskType,
} from "@/lib/server-writing";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface WritingTasksPageProps {
  searchParams: {
    task_type?: string;
  };
}

function asTaskType(value: string | undefined): WritingTaskType {
  return value === "task_2" ? "task_2" : "task_1";
}

export default async function WritingTasksPage({ searchParams }: WritingTasksPageProps) {
  const taskType = asTaskType(searchParams.task_type);

  const data = await listWritingTasks({ task_type: taskType, page_size: 30 }).catch(() => ({
    items: [] as WritingTaskListItem[],
    total: 0,
  }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
          <PenSquare className="h-3.5 w-3.5" />
          Writing tasks
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Choose a {taskType === "task_1" ? "Task 1" : "Task 2"} prompt
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick any ready-made prompt, or go back and paste your own topic in the writing workspace.
        </p>
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="inline-flex rounded-xl bg-muted/40 p-1 shadow-inner">
            <FilterChipLink
              active={taskType === "task_1"}
              href="/writing/tasks?task_type=task_1"
            >
              Task 1
            </FilterChipLink>
            <FilterChipLink
              active={taskType === "task_2"}
              href="/writing/tasks?task_type=task_2"
            >
              Task 2
            </FilterChipLink>
          </div>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
          <CardContent className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">No tasks match these filters yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Switch task type or use the custom topic form on the main writing page.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChipLink({
  active,
  href,
  children,
  variant = "tab",
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  variant?: "tab" | "pill";
}) {
  if (variant === "tab") {
    return (
      <Link
        href={href}
        className={cn(
          "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
          active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function TaskCard({ task }: { task: WritingTaskListItem }) {
  const stripped = stripHtml(task.description ?? "").slice(0, 140);
  const imgSrc = task.task_type === "task_1" ? resolveWritingAssetUrl(task.image_url) : null;
  const minutes = Math.round((task.time_limit_seconds ?? 0) / 60);

  return (
    <Link href={`/writing/tasks/${task.id}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden rounded-3xl border-border/60 bg-card/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
        {imgSrc ? (
          <div className="relative h-36 w-full overflow-hidden bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={task.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : task.task_type === "task_1" ? (
          <div className="flex h-36 items-center justify-center bg-muted/30 text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        ) : null}

        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="outline" className="border-border/60 bg-background/80 text-[10px] uppercase tracking-[0.18em]">
              {task.task_type === "task_1" ? "Task 1" : "Task 2"}
            </Badge>
            {task.source ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{task.source}</span>
            ) : null}
          </div>

          <p className="line-clamp-2 text-base font-semibold tracking-tight text-foreground">{task.title}</p>

          {stripped ? (
            <p className="line-clamp-3 text-xs text-muted-foreground">{stripped}{stripped.length === 140 ? "…" : ""}</p>
          ) : null}

          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                {task.word_minimum}+ words
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {minutes} min
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Start <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
