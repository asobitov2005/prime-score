"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  WritingLimitStatus,
  WritingTaskType,
} from "@/lib/server-writing";

import { CustomTaskDialog } from "./custom-task-dialog";
import { WritingLimitTrigger } from "./writing-limit-gate";

interface CustomTaskCardProps {
  activeTaskType: WritingTaskType;
  limitStatus: WritingLimitStatus | null;
}

export function CustomTaskCard({
  activeTaskType,
  limitStatus,
}: CustomTaskCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <WritingLimitTrigger
        limitStatus={limitStatus}
        onAllowedClick={() => setOpen(true)}
        className="group block w-full text-left"
      >
        <Card className="relative overflow-hidden rounded-2xl border-[#9db7c6]/55 bg-[#eaf2f7] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#7fa2b6]/70 hover:bg-[#e2edf4] hover:shadow-md dark:border-[#4f7187]/45 dark:bg-[#1f3443]/55 dark:hover:border-[#6f93a8]/60">
          <CardContent className="relative z-10 flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-sm dark:border-primary/25 dark:bg-primary/15 dark:text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Check my essay
                  </p>
                  <p className="text-sm font-medium tracking-tight text-muted-foreground">
                    Paste a real IELTS question, upload visuals, and get band +
                    sentence fixes.
                  </p>
                </div>
              </div>
              <Badge
                tone="outline"
                className="border-[#9db7c6]/70 bg-white/65 text-[10px] uppercase tracking-[0.18em] text-[#466b80] dark:border-[#6f93a8]/45 dark:bg-[#6f93a8]/15 dark:text-[#c4d7e2]"
              >
                Custom
              </Badge>
            </div>
          </CardContent>
        </Card>
      </WritingLimitTrigger>
      <CustomTaskDialog
        taskType={activeTaskType}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export { CustomTaskDialog } from "./custom-task-dialog";
