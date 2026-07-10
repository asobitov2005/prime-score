"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { AdminTestRow } from "./page-shared";

export function useTestsPageScope() {

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
        const data = await adminApi.listTests();
        setTests(data.map((t: any) => ({
          id: t.id, title: t.title, type: t.type, format: t.format ?? "full",
          source: t.source, sourceDetail: t.sourceDetail ?? "", accessType: t.accessType,
          status: t.status, reviewStatus: t.reviewStatus ?? "needs_review", updatedAt: t.updatedAt ?? new Date().toISOString(),
          questions: t.questions, version: t.version,
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
  return { searchParams, currentType, typeLabel, tests, setTests, loading, setLoading, selectedIds, setSelectedIds, bulkMsg, setBulkMsg, bulkLoading, setBulkLoading, actionsOpen, setActionsOpen, deleteConfirmId, setDeleteConfirmId, deleteLoadingId, setDeleteLoadingId, actionsRef, formatFilter, setFormatFilter, accessFilter, setAccessFilter, statusFilter, setStatusFilter, search, setSearch, hasFilters, clearFilters, fetchTests, filtered, sortedFiltered, allSelected, toggleAll, toggle, doBulk, ids, noneSelected, selectedDraftIds, deleteDraft, deleteSelectedDrafts };
}

export type TestsPageScope = ReturnType<typeof useTestsPageScope>;
