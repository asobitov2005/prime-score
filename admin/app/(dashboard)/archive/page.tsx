"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardContent, CardTitle, SectionHeader, buttonClassName, formatDate } from "@/components/ui";
import { adminApi } from "@/lib/api";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { cn } from "@/lib/utils";

type AdminTestRow = {
  id: string;
  title: string;
  type: string;
  format: string;
  accessType: string;
  status: string;
  updatedAt: string;
  questions: number;
  version: number;
};

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

const IconDraft = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconPublish = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>;
const IconChevron = ({ open }: { open: boolean }) => <svg className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;
const IconSearch = () => <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconX = () => <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;

export default function ArchivePage() {
  const [tests, setTests] = useState<AdminTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const actionsRef = useRef<HTMLDivElement>(null);

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
      setTests(data.filter((t: any) => t.status === "archived").map((t: any) => ({
        id: t.id, title: t.title, type: t.test_type, format: t.format ?? "full",
        accessType: t.access_type, status: t.status,
        updatedAt: t.updated_at ?? new Date().toISOString(),
        questions: t.total_questions, version: t.version,
      })));
    } catch { setTests([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTests(); }, []);

  const filtered = search
    ? tests.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tests;

  const allSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((t) => t.id)));
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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Content Management"
        title="Archived Tests"
        description="Archived tests are hidden from users. Restore them to make active again."
        actions={
          <Link href="/tests" className={buttonClassName({ variant: "outline", size: "sm" })}>
            ← Back to Tests
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Actions */}
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
              <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
                <button onClick={() => doBulk(() => adminApi.bulkPublish(ids, "draft"))} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3">
                  <IconDraft /> Restore as Draft
                </button>
                <button onClick={() => doBulk(() => adminApi.bulkPublish(ids, "published"))} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                  <IconPublish /> Restore & Publish
                </button>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-border/60 mx-1" />

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

          {search && (
            <button onClick={() => setSearch("")} className="h-9 px-2.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
              <IconX /> Clear
            </button>
          )}

          <div className="ml-auto">
            <Badge tone="neutral">{filtered.length} archived</Badge>
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
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No archived tests.</div>
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
                  <th className="border-b border-border px-3 py-3 font-medium">Archived</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
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
                    <td className="border-b border-border/50 px-3 py-4 text-[11px] font-bold text-muted-foreground uppercase">{formatDate(row.updatedAt)}</td>
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
