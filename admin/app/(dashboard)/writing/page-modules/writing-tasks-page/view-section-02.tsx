"use client";
import type { WritingTasksPageScope } from "./controller";
import { Link, Plus, SectionHeader, buttonClassName } from "../dependencies";

export function WritingTasksPageSection2({ scope }: { scope: WritingTasksPageScope }) {
  return (
    <SectionHeader
            eyebrow="Content Management"
            title="Writing Tasks"
            description="Manage AI Writing Checker prompts, diagrams, and reference answers."
            actions={
              <div className="flex items-center gap-3">
                <Link href="/writing/submissions" className={buttonClassName({ variant: "ghost", size: "sm" })}>
                  Submissions
                </Link>
                <Link href="/writing/new" className={buttonClassName({ variant: "solid", size: "sm" })}>
                  <Plus className="h-4 w-4" />
                  New Writing Task
                </Link>
              </div>
            }
          />
  );
}
