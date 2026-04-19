"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Globe,
  Crown,
  BookOpen,
  Headphones,
  CheckSquare,
  Square,
  Send,
  FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

interface AdminTest {
  id: string;
  title: string;
  test_type: string;
  format: string;
  access_type: string;
  status: string;
  source: string;
  total_questions: number;
  version: number;
}

type StatusFilter = "all" | "draft" | "published" | "archived";
type TypeFilter = "all" | "reading" | "listening";

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
];

const typeFilters: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
];

function formatDisplay(f: string) {
  if (!f || f === "full") return "Full Test";
  return f.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function AdminTestsPage() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Testlar</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">
          {filtered.length} ta test {statusFilter !== "all" && `(${statusFilter})`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-muted/40 p-1 rounded-xl flex items-center border border-border/50">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => { setStatusFilter(f.id); setSelectedIds(new Set()); }}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                statusFilter === f.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="bg-muted/40 p-1 rounded-xl flex items-center border border-border/50">
          {typeFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => { setTypeFilter(f.id); setSelectedIds(new Set()); }}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                typeFilter === f.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {bulkMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm font-medium text-emerald-600">
          {bulkMsg}
        </div>
      )}

      <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <CardHeader className="px-6 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
                Hammasini tanlash
              </button>
              {selectedIds.size > 0 && (
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {selectedIds.size} tanlangan
                </span>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-xl font-bold gap-2"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={bulkLoading}
                >
                  Amal tanlash <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", dropdownOpen && "rotate-180")} />
                </Button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => handleBulkPublish("published")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left hover:bg-muted/50 transition-colors"
                    >
                      <Send className="h-4 w-4 text-emerald-500" />
                      Publish qilish
                    </button>
                    <button
                      onClick={() => handleBulkPublish("draft")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left hover:bg-muted/50 transition-colors border-t border-border/40"
                    >
                      <FileEdit className="h-4 w-4 text-amber-500" />
                      Draft qilish
                    </button>
                    <div className="border-t border-border/40" />
                    <button
                      onClick={() => handleBulkAccess("public")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left hover:bg-muted/50 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-blue-500" />
                      Public qilish
                    </button>
                    <button
                      onClick={() => handleBulkAccess("premium")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left hover:bg-muted/50 transition-colors border-t border-border/40"
                    >
                      <Crown className="h-4 w-4 text-amber-500" />
                      Premium qilish
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Table Header */}
        <div className="px-6 py-3 bg-muted/10 border-b border-border/30 grid grid-cols-[2rem_1fr_6rem_6rem_6rem_7rem_6rem] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div />
          <div>Sarlavha</div>
          <div>Tur</div>
          <div>Format</div>
          <div>Kirish</div>
          <div>Status</div>
          <div>Savollar</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {filtered.map((test) => {
            const isSelected = selectedIds.has(test.id);
            return (
              <div
                key={test.id}
                className={cn(
                  "px-6 py-4 grid grid-cols-[2rem_1fr_6rem_6rem_6rem_7rem_6rem] gap-4 items-center hover:bg-muted/20 transition-colors cursor-pointer",
                  isSelected && "bg-primary/5"
                )}
                onClick={() => toggleOne(test.id)}
              >
                <div>
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{test.title}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                    {test.source?.replace("_", " ")} · v{test.version}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {test.test_type === "reading" ? (
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                  ) : (
                    <Headphones className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span className="text-xs font-semibold capitalize">{test.test_type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {formatDisplay(test.format)}
                  </span>
                </div>
                <div>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      accessColor(test.access_type)
                    )}
                  >
                    {test.access_type === "premium" ? "Premium" : "Public"}
                  </span>
                </div>
                <div>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      statusColor(test.status)
                    )}
                  >
                    {test.status}
                  </span>
                </div>
                <div className="text-sm font-bold text-muted-foreground">{test.total_questions}</div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center text-muted-foreground text-sm font-medium">
              Testlar topilmadi
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
