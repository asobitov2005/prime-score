import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { WritingTaskForm } from "@/components/writing-task-form";

export const dynamic = "force-dynamic";

export default function NewWritingTaskPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/writing"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to writing tasks
      </Link>
      <SectionHeader
        eyebrow="New Writing Task"
        title="Create writing task"
        description="Configure the prompt, optional diagram, and reference answer."
      />
      <WritingTaskForm mode="create" />
    </div>
  );
}
