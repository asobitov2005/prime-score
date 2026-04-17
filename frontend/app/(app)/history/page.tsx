import Link from "next/link";
import { Download, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserAttempts } from "@/lib/server-me";

export default async function HistoryPage() {
  const attempts = await getUserAttempts();
  return (
    <div className="space-y-6">
      
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        <CardHeader className="space-y-2 relative z-10 p-6 lg:px-10 lg:pt-10 lg:pb-6 border-b border-border/40 bg-muted/10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Test History</CardTitle>
              <CardDescription className="text-muted-foreground text-base font-medium mt-1">
                Analyze your past performance, track progress, and revisit mistakes.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] p-6 lg:px-10 lg:py-6 relative z-10 bg-background/50">
          
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
            <Input placeholder="Search by test title or date..." className="pl-12 h-12 text-base border-border/60 bg-muted/30 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary shadow-inner rounded-xl transition-all hover:bg-muted/50 focus:bg-background" />
          </div>

          
          <Button variant="outline" className="h-12 px-6 text-sm font-bold rounded-xl shadow-sm border-border/60 bg-muted/30 text-foreground hover:bg-muted/80">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

        </CardContent>
      </Card>


      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">{attempt.testTitle}</TableCell>
                  <TableCell>{attempt.source}</TableCell>
                  <TableCell>
                    <Badge tone={attempt.mode === "practice" ? "success" : "warning"}>{attempt.mode}</Badge>
                  </TableCell>
                  <TableCell>{attempt.date}</TableCell>
                  <TableCell>{attempt.score}</TableCell>
                  <TableCell>{attempt.band ?? "N/A"}</TableCell>
                  <TableCell>{attempt.timeSpent}</TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/attempts/${attempt.id}/result`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="flex justify-end pt-4">
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
