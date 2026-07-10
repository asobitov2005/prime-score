"use client";

import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import Link from "next/link";
import { Badge, Card, CardContent, SectionHeader, buttonClassName } from "@/components/ui";
import { AdminTableLoadingSkeleton } from "@/components/loading-skeletons";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FilterDropdown, IconArchive, IconChevron, IconGlobe, IconSearch, IconTrash, IconX, badgeToneForReviewStatus, badgeToneForStatus, formatDateTime } from "./page-shared";
import type { TestsPageScope } from "./page-scope";

export function TestsPageView({ scope }: { scope: TestsPageScope }) {
  const { currentType, typeLabel, loading, selectedIds, bulkMsg, bulkLoading, actionsOpen, setActionsOpen, deleteConfirmId, setDeleteConfirmId, deleteLoadingId, actionsRef, formatFilter, setFormatFilter, accessFilter, setAccessFilter, statusFilter, setStatusFilter, search, setSearch, hasFilters, clearFilters, sortedFiltered, allSelected, toggleAll, toggle, doBulk, ids, noneSelected, deleteDraft, deleteSelectedDrafts } = scope;
  return (
    (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Content Management"
            title={`${typeLabel} Tests`}
            description={`Manage your IELTS ${typeLabel.toLowerCase()} materials.`}
            actions={
              <div className="flex items-center gap-3">
                <Link href="/archive" className={buttonClassName({ variant: "ghost", size: "sm" })}>Archive</Link>
                <Link href={`/tests/new?type=${currentType}`} className={buttonClassName({ variant: "solid", size: "sm" })}>New {typeLabel} Test</Link>
              </div>
            }
          />
    
          {/* Toolbar: Actions + Filters */}
          <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Actions — always visible */}
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => !noneSelected && setActionsOpen(!actionsOpen)}
                  className={cn(
                    "h-9 pl-3 pr-2 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-all",
                    noneSelected
                      ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
                      : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                  )}
                  title={noneSelected ? "Avval testlarni tanlang" : `${selectedIds.size} ta tanlangan`}
                >
                  {!noneSelected && <Badge tone="info" className="text-[10px] px-1.5 py-0">{selectedIds.size}</Badge>}
                  Actions
                  <IconChevron open={actionsOpen} />
                </button>
                {actionsOpen && !noneSelected && (
                  <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
                    <button onClick={() => doBulk(() => adminApi.bulkAccess(ids, "public"))} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3">
                      <IconGlobe /> Public qilish
                    </button>
                    <button onClick={() => doBulk(() => adminApi.bulkAccess(ids, "premium"))} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                      <PrimePremiumIcon className="h-4 w-4" /> Premium qilish
                    </button>
                    <button onClick={() => doBulk(() => adminApi.bulkPublish(ids, "archived"))} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30 text-red-500">
                      <IconArchive /> Archive
                    </button>
                    <button onClick={() => void deleteSelectedDrafts()} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30 text-red-600">
                      <IconTrash /> Delete drafts
                    </button>
                  </div>
                )}
              </div>
    
              <div className="h-5 w-px bg-border/60 mx-1" />
    
              {/* Filters */}
              <FilterDropdown label="Format" value={formatFilter} onChange={setFormatFilter} options={
                currentType === "listening"
                  ? [
                      { id: "all", label: "All formats" },
                      { id: "full", label: "Full Test" },
                      { id: "part_1", label: "Part 1" },
                      { id: "part_2", label: "Part 2" },
                      { id: "part_3", label: "Part 3" },
                      { id: "part_4", label: "Part 4" },
                    ]
                  : [
                      { id: "all", label: "All formats" },
                      { id: "full", label: "Full Test" },
                      { id: "passage_1", label: "Passage 1" },
                      { id: "passage_2", label: "Passage 2" },
                      { id: "passage_3", label: "Passage 3" },
                    ]
              } />
              <FilterDropdown label="Access" value={accessFilter} onChange={setAccessFilter} options={[
                { id: "all", label: "All access" },
                { id: "public", label: "Public" },
                { id: "premium", label: "Premium" },
              ]} />
              <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={[
                { id: "all", label: "All statuses" },
                { id: "draft", label: "Draft" },
                { id: "published", label: "Published" },
              ]} />
    
              {/* Search */}
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2"><IconSearch /></div>
                <input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-40 pl-8 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
                />
              </div>
    
              {hasFilters && (
                <button onClick={clearFilters} className="h-9 px-2.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5" title="Clear all filters">
                  <IconX /> Clear
                </button>
              )}
    
              <div className="ml-auto">
                <Badge tone="neutral">{sortedFiltered.length} tests</Badge>
              </div>
            </div>
          </div>
    
          {bulkMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-medium text-emerald-600">{bulkMsg}</div>
          )}
    
          {/* Table */}
          <Card>
            <CardContent className="overflow-x-auto p-0">
              {loading ? (
                <AdminTableLoadingSkeleton rows={6} columns={7} />
              ) : (
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground bg-muted/30">
                      <th className="border-b border-border px-4 py-3 font-medium w-10">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-primary h-4 w-4 rounded cursor-pointer" />
                      </th>
                      <th className="border-b border-border px-3 py-3 font-medium">Title</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Format</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Access</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Status</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Updated</th>
                      <th className="border-b border-border px-3 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFiltered.length === 0 ? (
                      <tr><td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={7}>No tests found.</td></tr>
                    ) : null}
                    {sortedFiltered.map((row) => (
                      <tr key={row.id} className={cn("align-top transition-colors", selectedIds.has(row.id) ? "bg-primary/5" : "hover:bg-muted/30")}>
                        <td className="border-b border-border/50 px-4 py-4">
                          <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggle(row.id)} className="accent-primary h-4 w-4 rounded cursor-pointer" />
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <div className="font-medium text-foreground">{row.title}</div>
                          <div className="mt-1 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                            {row.type} · {row.questions} Qs · v{row.version}
                          </div>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <Badge tone="info" className="text-[10px] uppercase font-black tracking-widest">
                            {row.format === "full" ? "FULL" : row.format.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <Badge tone={row.accessType === "public" ? "success" : "paused"} className="text-[10px] uppercase font-black tracking-widest">{row.accessType}</Badge>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <div className="flex flex-col gap-1.5">
                            <Badge tone={badgeToneForStatus(row.status)} className="text-[10px] uppercase font-black tracking-widest">{row.status}</Badge>
                            <Badge tone={badgeToneForReviewStatus(row.reviewStatus)} className="text-[10px] uppercase font-black tracking-widest">
                              review: {row.reviewStatus}
                            </Badge>
                          </div>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4 text-[11px] font-bold text-muted-foreground">{formatDateTime(row.updatedAt)}</td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex justify-end gap-2">
                              <Link href={`/tests/${row.id}/edit`} className={buttonClassName({ variant: "outline", size: "sm" })}>
                                {row.status === "published" ? "Edit Published" : "Edit"}
                              </Link>
                              <a href={`http://localhost:3100/tests/${row.id}`} target="_blank" rel="noreferrer" className={buttonClassName({ variant: "ghost", size: "sm" })}>Preview</a>
                              {row.status === "draft" ? (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId((current) => current === row.id ? null : row.id)}
                                  className={cn(
                                    buttonClassName({ variant: "ghost", size: "sm" }),
                                    "text-red-600 hover:bg-red-500/10 hover:text-red-600"
                                  )}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <IconTrash />
                                    Delete
                                  </span>
                                </button>
                              ) : null}
                            </div>
                            {deleteConfirmId === row.id ? (
                              <div className="w-[240px] rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left">
                                <p className="text-sm font-semibold text-foreground">Delete this draft?</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  This will permanently remove the draft test and its question groups.
                                </p>
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className={buttonClassName({ variant: "ghost", size: "sm" })}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteDraft(row.id)}
                                    disabled={deleteLoadingId === row.id}
                                    className={cn(
                                      buttonClassName({ variant: "danger", size: "sm" }),
                                      "disabled:opacity-60"
                                    )}
                                  >
                                    {deleteLoadingId === row.id ? "Deleting..." : "Delete Draft"}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )
  );
}
