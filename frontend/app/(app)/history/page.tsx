import Link from "next/link";
import { Download, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserAttempts } from "@/lib/server-me";
import { cn } from "@/lib/utils";

export default async function HistoryPage() {
  const attempts = await getUserAttempts();
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        
        <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Test History</CardTitle>
              <CardDescription className="text-muted-foreground text-sm font-medium">
                Analyze your past performance, track progress, and revisit mistakes.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] p-4 lg:px-6 relative z-10 bg-background/50">
          
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input placeholder="Search by test title or date..." className="pl-10 h-10 text-sm border-border/60 bg-muted/20 text-foreground rounded-lg transition-all focus:bg-background" />
          </div>

          <Button variant="outline" size="sm" className="h-10 px-4 text-xs font-bold rounded-lg border-border/60 bg-muted/20 hover:bg-muted/40">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Filters
          </Button>

        </CardContent>
      </Card>


      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="h-10 text-xs font-bold">Test</TableHead>
                <TableHead className="h-10 text-xs font-bold">Source</TableHead>
                <TableHead className="h-10 text-xs font-bold">Mode</TableHead>
                <TableHead className="h-10 text-xs font-bold">Date</TableHead>
                <TableHead className="h-10 text-xs font-bold">Score</TableHead>
                <TableHead className="h-10 text-xs font-bold">Band</TableHead>
                <TableHead className="h-10 text-xs font-bold">Time</TableHead>
                <TableHead className="h-10 text-xs font-bold text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-sm py-3">{attempt.testTitle}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3">{attempt.source}</TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={cn(
                      "font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm border",
                      attempt.mode === "practice" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                    )}>
                      {attempt.mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-3">{attempt.date}</TableCell>
                  <TableCell className="font-bold text-sm py-3">{attempt.score}</TableCell>
                  <TableCell className="font-bold text-primary text-sm py-3">{attempt.band ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3">{attempt.timeSpent}</TableCell>
                  <TableCell className="text-right py-3 pr-4">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-medium hover:bg-primary/10 hover:text-primary">
                      <Link href={`/attempts/${attempt.id}/result`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end p-4 border-t border-border/40 bg-muted/5">
          <Button variant="outline" size="sm" className="h-9 text-xs font-bold">
            <Download className="h-3.5 w-3.5 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}
