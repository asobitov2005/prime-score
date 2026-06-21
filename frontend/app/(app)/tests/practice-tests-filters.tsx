"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ActiveType = "all" | "reading" | "listening";
type AccessFilter = "all" | "public" | "premium";
type StatusFilter = "all" | "not_started" | "in_progress" | "completed";
type SortFilter = "newest" | "oldest" | "free_first" | "recently_added";

interface PracticeTestsFiltersProps {
  activeType: ActiveType;
  activeFormat: string;
  activeSource: string;
  activeAccess: AccessFilter;
  activeStatus: StatusFilter;
  activeSort: SortFilter;
}

const sourceOptions = [
  { value: "", label: "All Sources" },
  { value: "cambridge", label: "Cambridge Official" },
  { value: "custom", label: "Exam Practice Tests" },
  { value: "real_exam", label: "Recent Exam Papers" },
] as const;

const accessOptions = [
  { value: "all", label: "All" },
  { value: "public", label: "Free" },
  { value: "premium", label: "Premium" },
] as const;

const statusOptions = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "free_first", label: "Free first" },
  { value: "recently_added", label: "Recently added" },
] as const;

function getFormatOptions(activeType: ActiveType) {
  if (activeType === "reading") {
    return [
      { value: "all", label: "All" },
      { value: "full", label: "Full Test" },
      { value: "passage_1", label: "Passage 1" },
      { value: "passage_2", label: "Passage 2" },
      { value: "passage_3", label: "Passage 3" },
    ];
  }

  if (activeType === "listening") {
    return [
      { value: "all", label: "All" },
      { value: "full", label: "Full Test" },
      { value: "part_1", label: "Part 1" },
      { value: "part_2", label: "Part 2" },
      { value: "part_3", label: "Part 3" },
      { value: "part_4", label: "Part 4" },
    ];
  }

  return [
    { value: "all", label: "All" },
    { value: "full", label: "Full Test" },
    { value: "passage_1", label: "Passage 1" },
    { value: "passage_2", label: "Passage 2" },
    { value: "passage_3", label: "Passage 3" },
    { value: "part_1", label: "Part 1" },
    { value: "part_2", label: "Part 2" },
    { value: "part_3", label: "Part 3" },
    { value: "part_4", label: "Part 4" },
  ];
}

function getLabel<T extends readonly { value: string; label: string }[]>(options: T, value: string) {
  return options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "All";
}

export function PracticeTestsFilters({
  activeType,
  activeFormat,
  activeSource,
  activeAccess,
  activeStatus,
  activeSort,
}: PracticeTestsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const formatOptions = useMemo(() => getFormatOptions(activeType), [activeType]);

  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
      return;
    }
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (
      (key === "format" && value === "all") ||
      (key === "source" && value === "") ||
      (key === "access" && value === "all") ||
      (key === "status" && value === "all") ||
      (key === "sort" && value === "newest")
    ) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(params.toString() ? `/tests?${params.toString()}` : "/tests");
  }

  function resetFilters() {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    const type = searchParams.get("type");
    if (type) {
      params.set("type", type);
    }
    if (q) {
      params.set("q", q);
    }
    router.push(params.toString() ? `/tests?${params.toString()}` : "/tests");
    setSheetOpen(false);
  }

  const hasFilters = Boolean(activeFormat !== "all" || activeSource || activeAccess !== "all" || activeStatus !== "all" || activeSort !== "newest");

  const FilterFields = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-1" : "grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))]",
      )}
    >
      <FilterSelect label={activeType === "listening" ? "Listening" : activeType === "reading" ? "Reading" : "Type"} value={activeFormat} options={formatOptions} onChange={(value) => updateParam("format", value)} />
      <FilterSelect label="Source" value={activeSource} options={sourceOptions} onChange={(value) => updateParam("source", value)} />
      <FilterSelect label="Access" value={activeAccess} options={accessOptions} onChange={(value) => updateParam("access", value)} />
      <FilterSelect label="Status" value={activeStatus} options={statusOptions} onChange={(value) => updateParam("status", value)} />
      <FilterSelect label="Sort" value={activeSort} options={sortOptions} onChange={(value) => updateParam("sort", value)} />
    </div>
  );

  return (
    <>
      <div className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none md:block">
        <div className="flex flex-col gap-3">
          <FilterFields />
          {hasFilters ? (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 rounded-lg px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Reset filters
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="md:hidden">
        <Button
          variant="outline"
          onClick={() => setSheetOpen(true)}
          className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasFilters ? (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F45A0B] px-1.5 text-xs font-semibold text-white">
              <Check className="h-3 w-3" />
            </span>
          ) : null}
        </Button>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl dark:border-t dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Filters</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Refine the test list</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterFields compact />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                Reset filters
              </Button>
              <Button
                onClick={() => setSheetOpen(false)}
                className="h-11 rounded-xl bg-[#F45A0B] text-sm font-semibold text-white hover:bg-[#d94e08]"
              >
                Show tests
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-11 rounded-xl border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 shadow-none focus-visible:border-orange-400 focus-visible:ring-orange-200 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:focus-visible:border-orange-500/40 dark:focus-visible:ring-orange-500/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <span className="sr-only">{getLabel(options, value)}</span>
    </label>
  );
}
