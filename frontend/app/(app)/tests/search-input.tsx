"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({ activeType }: { activeType: string }) {
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
    <div className="relative w-full sm:max-w-xs shrink-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${activeType} tests...`}
        className="pl-10 h-10 bg-card/50 border-border/60 rounded-xl focus:ring-primary/20"
      />
    </div>
  );
}