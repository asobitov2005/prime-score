"use client";

import { Link, PenSquare, Plus, Search, buttonClassName } from "./dependencies";



export function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="rounded-full bg-muted p-4">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold">No tasks match these filters</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Try adjusting your search or clearing the filters.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          Clear filters
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-primary/10 p-5">
        <PenSquare className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-bold">Build your first writing task</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Create Task 1 (chart description) or Task 2 (essay) prompts. Students will see them in the AI Writing Checker.
        </p>
      </div>
      <Link href="/writing/new" className={buttonClassName({ variant: "solid", size: "md" })}>
        <Plus className="h-4 w-4" />
        Create your first writing task
      </Link>
    </div>
  );
}
