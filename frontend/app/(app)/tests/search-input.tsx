"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({ activeType, placeholder }: { activeType: string; placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      
      if (searchParams.get("q") !== params.get("q")) {
        router.push(`/tests?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, searchParams, router]);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  return (
    <div className="relative w-full shrink-0">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? `Search ${activeType} tests...`}
        className="h-10 rounded-full border-slate-200 bg-slate-50 pl-10 text-sm font-medium text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:border-blue-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-blue-500/40 dark:focus-visible:bg-slate-950 dark:focus-visible:ring-blue-500/10"
      />
    </div>
  );
}
