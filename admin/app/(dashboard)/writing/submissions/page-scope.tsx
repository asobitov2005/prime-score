"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { writingApi } from "@/lib/writing-api";
import type { WritingSubmission } from "@/lib/writing-api";
import { PAGE_SIZE } from "./page-shared";

export function useWritingSubmissionsPageScope() {

  const searchParams = useSearchParams();

  const initialTaskId = searchParams.get("task_id") ?? "";

  const initialUserId = searchParams.get("user_id") ?? "";

  const initialStatus = searchParams.get("status") ?? "all";

  const [items, setItems] = useState<WritingSubmission[]>([]);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const [taskIdFilter, setTaskIdFilter] = useState<string>(initialTaskId);

  const [userIdFilter, setUserIdFilter] = useState<string>(initialUserId);

  const [page, setPage] = useState(1);

  const [actionId, setActionId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  useEffect(() => {
      setPage(1);
    }, [statusFilter, taskIdFilter, userIdFilter]);

  const fetchSubmissions = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await writingApi.listSubmissions({
          status: statusFilter !== "all" ? statusFilter : undefined,
          task_id: taskIdFilter || undefined,
          user_id: userIdFilter || undefined,
          page,
          page_size: PAGE_SIZE
        });
        setItems(result.items);
        setTotal(result.total);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load submissions.";
        setError(message);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, [statusFilter, taskIdFilter, userIdFilter, page]);

  useEffect(() => {
      void fetchSubmissions();
    }, [fetchSubmissions]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilters = statusFilter !== "all" || taskIdFilter !== "" || userIdFilter !== "";

  function clearFilters() {
      setStatusFilter("all");
      setTaskIdFilter("");
      setUserIdFilter("");
    }

  async function regrade(id: string) {
      setActionId(id);
      try {
        await writingApi.regradeSubmission(id);
        setToast({ message: "Regrade queued.", tone: "success" });
        await fetchSubmissions();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Regrade failed.";
        setToast({ message, tone: "danger" });
      } finally {
        setActionId(null);
      }
    }
  return { searchParams, initialTaskId, initialUserId, initialStatus, items, setItems, total, setTotal, loading, setLoading, error, setError, statusFilter, setStatusFilter, taskIdFilter, setTaskIdFilter, userIdFilter, setUserIdFilter, page, setPage, actionId, setActionId, toast, setToast, fetchSubmissions, totalPages, hasFilters, clearFilters, regrade };
}

export type WritingSubmissionsPageScope = ReturnType<typeof useWritingSubmissionsPageScope>;
