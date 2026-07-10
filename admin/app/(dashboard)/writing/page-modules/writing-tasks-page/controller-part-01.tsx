"use client";
import type { BaseScope } from "./base";
import { WritingTask, useCallback, useEffect, useState, writingApi } from "../dependencies";
import { PAGE_SIZE, StatusFilter, TypeFilter } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const [tasks, setTasks] = useState<WritingTask[]>([]);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [page, setPage] = useState(1);

  const [actionId, setActionId] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  // debounce search
    useEffect(() => {
      const t = window.setTimeout(() => setDebouncedSearch(search), 300);
      return () => window.clearTimeout(t);
    }, [search]);

  useEffect(() => {
      setPage(1);
    }, [debouncedSearch, typeFilter, statusFilter]);

  const fetchTasks = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await writingApi.listTasks({
          status: statusFilter,
          task_type: typeFilter,
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch || undefined
        });
        setTasks(result.items);
        setTotal(result.total);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load tasks.";
        setError(message);
        setTasks([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, [statusFilter, typeFilter, page, debouncedSearch]);

  useEffect(() => {
      void fetchTasks();
    }, [fetchTasks]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilters =
      typeFilter !== "all" || statusFilter !== "all" || debouncedSearch !== "";

  function clearFilters() {
      setTypeFilter("all");
      setStatusFilter("all");
      setSearch("");
    }

  async function runTaskAction(
      id: string,
      action: () => Promise<unknown>,
      successMsg: string
    ) {
      setActionId(id);
      try {
        await action();
        setToast({ message: successMsg, tone: "success" });
        await fetchTasks();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed.";
        setToast({ message, tone: "danger" });
      } finally {
        setActionId(null);
      }
    }

  async function handleDelete(id: string) {
      setActionId(id);
      try {
        await writingApi.deleteTask(id);
        setToast({ message: "Task deleted.", tone: "success" });
        setDeleteConfirmId(null);
        await fetchTasks();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed.";
        setToast({ message, tone: "danger" });
      } finally {
        setActionId(null);
      }
    }

  return { tasks, setTasks, total, setTotal, loading, setLoading, error, setError, search, setSearch, debouncedSearch, setDebouncedSearch, typeFilter, setTypeFilter, statusFilter, setStatusFilter, page, setPage, actionId, setActionId, deleteConfirmId, setDeleteConfirmId, toast, setToast, fetchTasks, totalPages, hasFilters, clearFilters, runTaskAction, handleDelete };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
