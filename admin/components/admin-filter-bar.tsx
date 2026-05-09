"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Select } from "./ui";

const TIME_PRESETS = [
  { value: "all_time", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
];

const TEST_TYPES = [
  { value: "all", label: "All Test Types" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "writing", label: "Writing" },
];

export function AdminFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [timePreset, setTimePreset] = useState(searchParams.get("time_preset") || "all_time");
  const [testType, setTestType] = useState(searchParams.get("test_type") || "all");

  useEffect(() => {
    setTimePreset(searchParams.get("time_preset") || "all_time");
    setTestType(searchParams.get("test_type") || "all");
  }, [searchParams]);

  const updateFilters = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all_time" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="sticky top-0 z-10 mb-6 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          <h2 className="text-sm font-semibold tracking-wide text-foreground">Global Filters</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Select
              className="min-w-[150px] appearance-none rounded-lg border-muted bg-muted/50 pl-4 pr-10 py-2 text-sm font-medium focus:ring-primary/20 hover:bg-muted"
              value={timePreset}
              onChange={(e) => {
                setTimePreset(e.target.value);
                updateFilters("time_preset", e.target.value);
              }}
            >
              {TIME_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </Select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          <div className="relative">
            <Select
              className="min-w-[150px] appearance-none rounded-lg border-muted bg-muted/50 pl-4 pr-10 py-2 text-sm font-medium focus:ring-primary/20 hover:bg-muted"
              value={testType}
              onChange={(e) => {
                setTestType(e.target.value);
                updateFilters("test_type", e.target.value);
              }}
            >
              {TEST_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
