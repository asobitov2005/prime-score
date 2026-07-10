"use client";
import type { WritingTasksPageScope } from "./controller";
import { Badge, Search, X } from "../dependencies";
import { FilterDropdown, StatusFilter, TypeFilter } from "../shared";

export function WritingTasksPageSection4({ scope }: { scope: WritingTasksPageScope }) {
  const { typeFilter, setTypeFilter, statusFilter, setStatusFilter, search, setSearch, hasFilters, clearFilters, total } = scope;
  return (
    <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown
                label="Type"
                value={typeFilter}
                onChange={(v) => setTypeFilter(v as TypeFilter)}
                options={[
                  { id: "all", label: "All types" },
                  { id: "task_1", label: "Task 1" },
                  { id: "task_2", label: "Task 2" }
                ]}
              />
              <FilterDropdown
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { id: "all", label: "All statuses" },
                  { id: "draft", label: "Draft" },
                  { id: "published", label: "Published" },
                  { id: "archived", label: "Archived" }
                ]}
              />
    
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  placeholder="Search title…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-56 pl-8 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
                />
              </div>
    
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 px-2.5 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 transition-colors flex items-center gap-1.5"
                  title="Clear all filters"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
    
              <div className="ml-auto">
                <Badge tone="neutral">
                  {total} {total === 1 ? "task" : "tasks"}
                </Badge>
              </div>
            </div>
          </div>
  );
}
