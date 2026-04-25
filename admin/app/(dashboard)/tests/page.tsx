"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle, SectionHeader, buttonClassName, formatDate } from "@/components/ui";
import { adminApi } from "@/lib/api";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

type AdminTestRow = {
  id: string;
  title: string;
  type: string;
  format: string;
  source: string;
  sourceDetail: string;
  accessType: string;
  status: string;
  updatedAt: string;
  questions: number;
  version: number;
};

function badgeToneForStatus(status: string): "neutral" | "success" | "warning" | "paused" {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "paused";
}

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/* ── Icons ── */
const IconGlobe = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>;
const IconCrown = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M2 20h20M5 17l-1-10 5 4 3-6 3 6 5-4-1 10z"/></svg>;
const IconArchive = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>;
const IconTrash = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M3 6h18M8 6V4h8v2m-7 4v7m6-7v7M6 6l1 14h10l1-14"/></svg>;
const IconChevron = ({ open }: { open: boolean }) => <svg className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;
const IconX = () => <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;
const IconSearch = () => <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;

/* ── Custom Dropdown ── */
function FilterDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "h-9 pl-3 pr-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all",
          value !== "all"
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-border bg-card text-foreground hover:bg-muted"
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">{label}</span>
        {current?.label ?? "All"}
        <IconChevron open={open} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={cn(
                "w-full px-3 py-2 text-sm text-left transition-colors flex items-center justify-between",
                value === opt.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {opt.label}
              {value === opt.id && (
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TestsPage() {
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "reading";
  const typeLabel = currentType === "listening" ? "Listening" : "Reading";

  const [tests, setTests] = useState<AdminTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [formatFilter, setFormatFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const hasFilters = formatFilter !== "all" || accessFilter !== "all" || statusFilter !== "all" || search !== "";

  const clearFilters = () => {
    setFormatFilter("all");
    setAccessFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const token = getClientAdminAccessToken();
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${API_BASE}/tests`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTests(data.map((t: any) => ({
        id: t.id, title: t.title, type: t.test_type, format: t.format ?? "full",
        source: t.source, sourceDetail: t.source_detail ?? "", accessType: t.access_type,
        status: t.status, updatedAt: t.updated_at ?? new Date().toISOString(),
        questions: t.total_questions, version: t.version,
      })));
    } catch { setTests([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTests(); setSelectedIds(new Set()); }, [currentType]);

  const filtered = tests.filter((t) => {
    if (t.status === "archived") return false;
    if (t.type !== currentType) return false;
    if (formatFilter !== "all" && t.format !== formatFilter) return false;
    if (accessFilter !== "all" && t.accessType !== accessFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sortedFiltered = useMemo(() => {
    const statusOrder: Record<string, number> = {
      draft: 0,
      published: 1,
      archived: 2,
    };

    return [...filtered].sort((left, right) => {
      const statusDiff = (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const rightUpdated = new Date(right.updatedAt).getTime();
      const leftUpdated = new Date(left.updatedAt).getTime();
      if (rightUpdated !== leftUpdated) {
        return rightUpdated - leftUpdated;
      }

      return right.title.localeCompare(left.title);
    });
  }, [filtered]);

  const allSelected = sortedFiltered.length > 0 && sortedFiltered.every((t) => selectedIds.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedFiltered.map((t) => t.id)));
  };
  const toggle = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const doBulk = async (action: () => Promise<{ message: string }>) => {
    setBulkLoading(true); setBulkMsg(""); setActionsOpen(false);
    try { const r = await action(); setBulkMsg(r.message); setSelectedIds(new Set()); fetchTests(); }
    catch { setBulkMsg("Xatolik yuz berdi."); }
    finally { setBulkLoading(false); }
  };

  const ids = Array.from(selectedIds);
  const noneSelected = selectedIds.size === 0;
  const selectedDraftIds = ids.filter((id) => tests.find((test) => test.id === id)?.status === "draft");

  const deleteDraft = async (testId: string) => {
    setDeleteLoadingId(testId);
    setBulkMsg("");
    try {
      const result = await adminApi.deleteDraft(testId);
      setBulkMsg(result.message);
      setDeleteConfirmId(null);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(testId);
        return next;
      });
      await fetchTests();
    } catch {
      setBulkMsg("Draft delete failed.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const deleteSelectedDrafts = async () => {
    if (selectedDraftIds.length === 0) {
      setBulkMsg("Only draft tests can be deleted.");
      setActionsOpen(false);
      return;
    }

    setBulkLoading(true);
    setBulkMsg("");
    setActionsOpen(false);
    try {
      await Promise.all(selectedDraftIds.map((testId) => adminApi.deleteDraft(testId)));
      setBulkMsg(`${selectedDraftIds.length} draft deleted.`);
      setSelectedIds(new Set());
      await fetchTests();
    } catch {
      setBulkMsg("Draft delete failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
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
                  <IconCrown /> Premium qilish
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
            <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
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
                      <Badge tone={badgeToneForStatus(row.status)} className="text-[10px] uppercase font-black tracking-widest">{row.status}</Badge>
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
  );
}
