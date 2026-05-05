import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Zap, ClipboardCheck, X, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCatalogTestDetail } from "@/lib/server-data";
import { StartTestButton } from "./start-buttons";
import { cn } from "@/lib/utils";

interface TestStartRoutePageProps {
  params: {
    testId: string;
  };
}

export default async function TestStartPage({ params }: TestStartRoutePageProps) {
  const { testId } = params;
  const test = await getCatalogTestDetail(testId);

  if (!test) {
    notFound();
  }

  const isFullTest = test.format === "full";
  const defaultSectionId = test.sections[0]?.id;

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        
        <div className="mb-4">
          <Link href={`/tests/${testId}`} className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to details
          </Link>
        </div>

        <Card className="overflow-hidden border-border/50 shadow-xl rounded-2xl bg-background">
          <div className="h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          
          <CardHeader className="p-6 text-center border-b border-border/5 bg-muted/5">
            <div className="flex justify-center gap-2 mb-3">
              <span className={cn(
                "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md",
                test.type === "reading" ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
              )}>
                {test.type}
              </span>
              <span className={cn("px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border", isFullTest ? "border-border/40 bg-muted text-foreground" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>
                {isFullTest ? "Full Test" : "Practice"}
              </span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">{test.title}</CardTitle>
            <CardDescription className="text-xs mt-1">Select your preferred practice mode</CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-3">
            {/* Practice Mode */}
            <div className="group relative flex flex-col items-center">
              <StartTestButton 
                testId={test.id} 
                testTitle={test.title}
                testType={test.type} 
                mode="practice" 
                scope={isFullTest ? "full" : "section"}
                sectionId={isFullTest ? undefined : defaultSectionId}
                className="w-full h-auto p-4 flex items-center gap-4 text-left bg-card hover:bg-muted/50 border border-border/60 hover:border-primary/40 rounded-xl transition-all shadow-none group"
                label={
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Practice Mode</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Flexible timer, pause enabled.</p>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Exam Mode */}
            {isFullTest && (
              <div className="group relative flex flex-col items-center">
                <StartTestButton 
                  testId={test.id} 
                  testTitle={test.title}
                  testType={test.type} 
                  mode="exam" 
                  scope="full"
                  className="w-full h-auto p-4 flex items-center gap-4 text-left bg-card hover:bg-red-50/50 dark:hover:bg-red-950/10 border border-border/60 hover:border-red-500/40 rounded-xl transition-all shadow-none group"
                  label={
                    <div className="flex items-center gap-4 w-full">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground">Exam Mode</p>
                          <span className="text-[8px] font-black uppercase bg-red-500 text-white px-1.5 py-0.5 rounded">Strict</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">60 min, no pause, full screen.</p>
                      </div>
                    </div>
                  }
                />
              </div>
            )}

            {!isFullTest && (
               <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Passage Practice</p>
                  <p className="text-[11px] text-muted-foreground">This non-full test starts directly in Practice mode.</p>
               </div>
            )}

            <div className="pt-2 text-center">
              <p className="text-[10px] text-muted-foreground italic">You will be redirected to the test workspace.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
