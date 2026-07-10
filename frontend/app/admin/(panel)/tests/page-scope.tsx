"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import { API_BASE, AdminTest, StatusFilter, TypeFilter } from "./page-shared";

export function useAdminTestsPageScope() {

  const { accessToken } = useAdminStore();

  const [tests, setTests] = useState<AdminTest[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [bulkLoading, setBulkLoading] = useState(false);

  const [bulkMsg, setBulkMsg] = useState("");

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const fetchTests = () => {
      if (!accessToken) return;
      setLoading(true);
      fetch(`${API_BASE}/admin/tests`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed");
          return res.json();
        })
        .then((data) => setTests(data))
        .catch(() => setError("Testlarni yuklab bo'lmadi."))
        .finally(() => setLoading(false));
    };

  useEffect(() => {
      fetchTests();
    }, [accessToken]);

  const filtered = tests.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (typeFilter !== "all" && t.test_type !== typeFilter) return false;
      return true;
    });

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const toggleSelectAll = () => {
      if (allSelected) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(filtered.map((t) => t.id)));
      }
    };

  const toggleOne = (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

  const handleBulkAccess = async (accessType: "public" | "premium") => {
      if (selectedIds.size === 0) return;
      setBulkLoading(true);
      setDropdownOpen(false);
      setBulkMsg("");
      try {
        const res = await fetch(`${API_BASE}/admin/tests/bulk-status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ ids: Array.from(selectedIds), access_type: accessType }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setBulkMsg(data.message ?? "Yangilandi.");
        setSelectedIds(new Set());
        fetchTests();
      } catch {
        setBulkMsg("Xatolik yuz berdi.");
      } finally {
        setBulkLoading(false);
      }
    };

  const handleBulkPublish = async (status: "published" | "draft") => {
      if (selectedIds.size === 0) return;
      setBulkLoading(true);
      setDropdownOpen(false);
      setBulkMsg("");
      try {
        const res = await fetch(`${API_BASE}/admin/tests/bulk-publish`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ ids: Array.from(selectedIds), status }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setBulkMsg(data.message ?? "Yangilandi.");
        setSelectedIds(new Set());
        fetchTests();
      } catch {
        setBulkMsg("Xatolik yuz berdi.");
      } finally {
        setBulkLoading(false);
      }
    };

  const statusColor = (s: string) => {
      if (s === "published") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      if (s === "draft") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      return "bg-muted text-muted-foreground border-border/40";
    };

  const accessColor = (a: string) => {
      if (a === "premium") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    };

  if (loading) {
      return (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-40 bg-muted rounded-xl" />
          <div className="h-12 bg-muted rounded-xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-xl" />
          ))}
        </div>
      );
    }
  return { accessToken, tests, setTests, loading, setLoading, error, setError, selectedIds, setSelectedIds, bulkLoading, setBulkLoading, bulkMsg, setBulkMsg, dropdownOpen, setDropdownOpen, statusFilter, setStatusFilter, typeFilter, setTypeFilter, fetchTests, filtered, allSelected, toggleSelectAll, toggleOne, handleBulkAccess, handleBulkPublish, statusColor, accessColor };
}

export type AdminTestsPageScope = ReturnType<typeof useAdminTestsPageScope>;
