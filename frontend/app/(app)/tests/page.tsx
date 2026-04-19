import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight, BookOpen, Headphones, Layout, Layers, Clock, FileText, User, CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StartTestModal } from "@/components/start-test-modal";
import { FilterSelect } from "./filter-select";
import { getCatalogTests } from "@/lib/server-data";
import { getUserAttempts } from "@/lib/server-me";
import { SearchInput } from "./search-input";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TestsPageProps {
  searchParams?: {
    type?: string;
    access?: string;
    format?: string;
    source?: string;
    q?: string;
  };
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const activeType = searchParams?.type || "reading";
  const activeFormat = searchParams?.format || "all";
  const activeSource = searchParams?.source || "";
  const searchQuery = searchParams?.q?.toLowerCase() || "";

  const [rawTests, userAttempts] = await Promise.all([
    getCatalogTests({ 
      type: activeType, 
      format: activeFormat === "all" ? undefined : activeFormat,
      source: activeSource
    }),
    getUserAttempts()
  ]);

  const tests = rawTests.filter(test => {
    if (!searchQuery) return true;
    return test.title.toLowerCase().includes(searchQuery) || test.sourceDetail.toLowerCase().includes(searchQuery);
  });
  const completedTestIds = new Set(
    userAttempts.filter(a => a.status === "completed").map(a => a.testId)
  );

  const hasActiveFilters = activeFormat !== "all" || activeSource !== "";

  const formatDisplay = (testFormat: string) => {
    if (!testFormat || testFormat === "full") return "Full Test";
    return testFormat.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formats = activeType === "reading" 
    ? [
        { id: "all", label: "All" },
        { id: "full", label: "Full Test" },
        { id: "passage_1", label: "Passage 1" },
        { id: "passage_2", label: "Passage 2" },
        { id: "passage_3", label: "Passage 3" },
      ]
    : [
        { id: "all", label: "All" },
        { id: "full", label: "Full Test" },
        { id: "part_1", label: "Part 1" },
        { id: "part_2", label: "Part 2" },
        { id: "part_3", label: "Part 3" },
        { id: "part_4", label: "Part 4" },
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto animate-in fade-in duration-500 overflow-hidden">
      
      {/* Header Card */}
      <div className="shrink-0 mb-6 mt-2">
        <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          
          <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Practice Tests</CardTitle>
                <CardDescription className="text-muted-foreground text-sm font-medium">
                  Choose from a wide range of IELTS {activeType} tests and improve your band score.
                </CardDescription>
              </div>
              <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters Container */}
      <div className="shrink-0 bg-background/95 backdrop-blur-md pb-4 space-y-4">
        {/* Primary Filter (Reading / Listening) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-muted/40 p-1 rounded-2xl border border-border/50 shadow-inner w-full md:w-max">
            {[
              { id: "reading", label: "Reading", icon: BookOpen },
              { id: "listening", label: "Listening", icon: Headphones }
            ].map(type => {
              const Icon = type.icon;
              const isActive = activeType === type.id;
              return (
                <Button
                  key={type.id}
                  asChild
                  variant="ghost"
                  className={cn(
                    "flex-1 md:w-36 h-10 rounded-xl font-black text-sm transition-all duration-300 gap-2",
                    isActive 
                      ? "bg-background text-foreground shadow-sm border border-border/50 scale-105 z-10" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Link href={`/tests?type=${type.id}`}>
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "opacity-50")} />
                    {type.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-xl border border-border/40">
            <span className="text-xs font-black text-primary">{tests.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tests Available</span>
          </div>
        </div>

        {/* Secondary Filter (Dynamic) */}
        <div className="bg-card/40 border border-border/40 rounded-[2rem] p-1 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 px-1">
            {formats.map((f) => {
              const isActive = activeFormat === f.id;
              return (
                <Button
                  key={f.id}
                  asChild
                  variant={isActive ? "solid" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 px-4 rounded-full font-bold text-xs whitespace-nowrap transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Link href={`/tests?type=${activeType}&format=${f.id}&source=${activeSource}`}>
                    {f.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pb-1">
          <SearchInput activeType={activeType} />
          
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            {hasActiveFilters && (
              <Button asChild variant="ghost" size="sm" className="h-10 px-4 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                <Link href={`/tests?type=${activeType}`}>
                  <X className="h-3.5 w-3.5 mr-2" />
                  Clear
                </Link>
              </Button>
            )}

            <div className="relative w-full sm:w-56 shrink-0">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10 pointer-events-none" />
              <FilterSelect activeType={activeType} activeFormat={activeFormat} activeSource={activeSource} />
            </div>
          </div>
        </div>
      </div>

      {/* Test Grid area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 pb-8 -mr-3">
        {tests.length === 0 ? (
        <div className="text-center py-20 bg-card/20 rounded-[3rem] border border-dashed border-border/60">
          <div className="mx-auto w-20 h-20 rounded-[2rem] bg-muted/30 flex items-center justify-center mb-6">
             <Layers className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No tests matching your filters</h3>
          <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-sm">
            We couldn't find any {activeFormat.replace("_", " ")} {activeType} tests. Try selecting "All Tests".
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test, index) => {
            const isFull = !test.format || test.format === "full";
            const isCompleted = index === 0 || completedTestIds.has(test.id);
            const takenCount = Math.floor(Math.random() * 2000) + 500;

            return (
              <Card key={test.id} className="group relative rounded-2xl border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 flex flex-col shadow-sm">
                <CardHeader className="p-5 pb-2 flex-1">
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex gap-2">
                        {test.accessType === "premium" && (
                          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Premium</span>
                          </div>
                        )}
                        
                        {isCompleted && (
                          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-semibold uppercase tracking-wider">Completed</span>
                          </div>
                        )}
                     </div>
                     
                     <Badge variant="secondary" className={cn(
                        "font-semibold uppercase text-[9px] tracking-widest px-2.5 py-0.5",
                        isFull ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none" : "bg-muted text-muted-foreground border-none"
                      )}>
                        {isFull ? "Full Test" : formatDisplay(test.format)}
                      </Badge>
                   </div>
                   
                   <div className="space-y-2 mt-1">
                     <CardTitle className="text-[15px] font-semibold leading-tight text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                       {test.title}
                     </CardTitle>
                     <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pt-1">
                       <span>{test.source.replace("_", " ")}</span>
                       <span className="flex items-center gap-1">
                         <User className="h-3 w-3 opacity-60" /> {takenCount.toLocaleString()} takes
                       </span>
                     </div>
                   </div>
                </CardHeader>

                <CardContent className="p-5 pt-2 shrink-0">
                   <div className="pt-3 border-t border-border/5">
                      <StartTestModal test={test} />
                   </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
