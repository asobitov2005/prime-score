import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Clock3, FileText, FolderOpen, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StartTestModal } from "@/components/start-test-modal";
import { getCatalogTestDetail } from "@/lib/server-data";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

interface TestDetailPageProps {
  params: {
    testId: string;
  };
}

export async function generateMetadata({ params }: TestDetailPageProps): Promise<Metadata> {
  const test = await getCatalogTestDetail(params.testId);

  if (!test) {
    return {
      title: "IELTS Practice Test Not Found | PrimeScore",
    };
  }

  const title = `${test.title} | IELTS ${test.type} Practice Test`;
  const description = test.description || `Practice ${test.questionCount} IELTS ${test.type} questions on PrimeScore.`;
  const canonicalPath = `/tests/${test.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      type: "article",
    },
  };
}

export default async function TestDetailPage({ params }: TestDetailPageProps) {
  const { testId } = params;
  const test = await getCatalogTestDetail(testId);

  if (!test) {
    notFound();
  }

  if (test.slug && test.slug !== testId) {
    permanentRedirect(`/tests/${test.slug}`);
  }

  const formatDisplay = (testFormat: string) => {
    if (!testFormat || testFormat === "full") return "Full Test";
    if (testFormat === "part") return "Part Level";
    const parts = testFormat.split("_");
    if (parts.length === 2) {
       return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + parts[1];
    }
    return testFormat;
  };

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
          <Link href="/tests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tests
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        
        <CardHeader className="space-y-4 relative z-10 p-6 md:p-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm border border-transparent",
                test.type === "reading" ? "bg-blue-500/10 text-blue-600 border-blue-500/10" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/10"
              )}>
                {test.type}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-muted text-foreground border border-border/40">
                {formatDisplay(test.format)}
              </span>
              {test.accessType === "premium" && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200 flex items-center gap-1">
                  Premium
                </span>
              )}
            </div>
            
            <CardTitle className="text-2xl md:text-3xl font-black tracking-tight text-foreground">{test.title}</CardTitle>
            <CardDescription className="max-w-2xl text-muted-foreground text-sm font-medium leading-relaxed">{test.description}</CardDescription>
          </div>
          
          <div className="pt-4">
            <StartTestModal test={test} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Metric icon={<Clock3 className="h-4 w-4" />} label="Duration" value={`${test.estimatedMinutes} min`} />
        <Metric icon={<FileText className="h-4 w-4" />} label="Questions" value={`${test.questionCount}`} />
        <Metric icon={<FolderOpen className="h-4 w-4" />} label="Source" value={test.source} />
        <Metric icon={<FileText className="h-4 w-4" />} label="Format" value={formatDisplay(test.format)} />
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="p-5 border-b border-border/10 bg-muted/5">
          <CardTitle className="text-base font-bold">Test structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-5">
          {test.sections.map((section, index) => (
            <div key={section.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-sm">Part {index + 1}: {section.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{section.teaser}</p>
              </div>
              <Badge variant="outline" className="bg-background text-[10px] font-bold px-2.5">{section.questionCount} questions</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="border-border/40 shadow-sm bg-background/50">
      <CardHeader className="space-y-2 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">{icon}</div>
        <div>
          <CardDescription className="text-[10px] uppercase font-bold tracking-wider mb-0.5">{label}</CardDescription>
          <CardTitle className="text-lg font-bold tracking-tight">{value}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}
