"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

type TestsCatalogType = "reading" | "listening";

function ReadingTestsSearch({
  query,
  onQueryChange,
  testType,
  className,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  testType: TestsCatalogType;
  className?: string;
}) {
  const [localQuery, setLocalQuery] = useState(query);
  const committedQuery = query.trim();

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    const normalizedQuery = localQuery.trim();
    if (normalizedQuery === committedQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onQueryChange(normalizedQuery);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [committedQuery, localQuery, onQueryChange]);

  const clearSearch = () => {
    setLocalQuery("");
    onQueryChange("");
  };

  const searchLabel = testType === "listening" ? "Listening Tests" : "Reading Tests";

  return (
    <div className={cn("relative h-11 min-w-0", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        type="text"
        value={localQuery}
        onChange={(event) => setLocalQuery(event.target.value)}
        placeholder={"Search tests..."}
        aria-label={searchLabel}
        className="h-full w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold text-slate-900 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.2)] outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-200 focus:ring-4 focus:ring-orange-100/70 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:focus:border-orange-500/40 dark:focus:ring-orange-500/10"
      />
      {localQuery ? (
        <button
          type="button"
          aria-label={"Reset filters"}
          onClick={clearSearch}
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function CustomFilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  id: "access" | "sort";
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "group flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border bg-white px-3 text-left shadow-[0_8px_20px_-18px_rgba(15,23,42,0.2)] transition-all dark:bg-slate-900/70 dark:shadow-none",
          open
            ? "border-orange-200 ring-4 ring-orange-100/70 dark:border-orange-500/35 dark:ring-orange-500/10"
            : "border-slate-200 hover:border-slate-300 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-none",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
            open
              ? "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
              : "border-slate-100 bg-slate-50 text-slate-400 group-hover:text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500 dark:group-hover:text-slate-300",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold leading-none text-slate-400 dark:text-slate-500">{label}</span>
          <span className="mt-1 block truncate text-sm font-semibold leading-none text-slate-900 dark:text-slate-100">
            {selectedOption.label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500",
            open && "rotate-180 text-orange-500 dark:text-orange-300",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={`${id}-${option.value}`}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                className={cn(
                  "flex h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50",
                )}
              >
                <span>{option.label}</span>
                {active ? <Check className="h-4 w-4 text-orange-600 dark:text-orange-300" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ReadingTestsFilterSelects({
  access,
  sort,
  query,
  testType = "reading",
  onAccessChange,
  onSortChange,
  onQueryChange,
}: {
  access: string;
  sort: string;
  query: string;
  testType?: TestsCatalogType;
  onAccessChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onQueryChange: (value: string) => void;
}) {
  const accessOptions = [
    { value: "all", label: "All Access" },
    { value: "free", label: "Free" },
    { value: "premium", label: "Premium" },
  ] as const;
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "title_az", label: "Title A-Z" },
    { value: "not_attempted", label: "Not Attempted" },
  ] as const;

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,18rem)_minmax(9.75rem,10.75rem)_minmax(9.75rem,10.75rem)] xl:w-auto xl:justify-end">
      <ReadingTestsSearch query={query} onQueryChange={onQueryChange} testType={testType} className="sm:col-span-2 lg:col-span-1" />
      <CustomFilterDropdown
        id="access"
        label={"Access"}
        value={access}
        options={accessOptions}
        onChange={onAccessChange}
        className="min-w-0"
      />
      <CustomFilterDropdown
        id="sort"
        label={"Sort by"}
        value={sort}
        options={sortOptions}
        onChange={onSortChange}
        className="min-w-0"
      />
    </div>
  );
}
