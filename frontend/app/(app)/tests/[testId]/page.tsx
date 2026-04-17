import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Clock3, FileText, FolderOpen, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StartTestModal } from "@/components/start-test-modal";
import { buildAttemptWorkspaceMeta, getTestById } from "@/lib/mock-data";
import { getCatalogTestDetail } from "@/lib/server-data";

interface TestDetailPageProps {
  params: {
    testId: string;
  };
}

export default async function TestDetailPage({ params }: TestDetailPageProps) {
  const { testId } = params;
  const test = await getCatalogTestDetail(testId);

  if (!test) {
    notFound();
  }

  const attemptShellSource = getTestById(testId) ?? getTestById(test.slug);
  const listeningMeta = test.type === "listening" && attemptShellSource
    ? buildAttemptWorkspaceMeta(attemptShellSource, "full", "exam")
    : null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-secondary border-none text-foreground relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
        <CardHeader className="space-y-4 relative z-10 p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="outline" className="border-border bg-muted text-slate-200">
              Test detail
            </Badge>
            <Badge tone={test.accessType === "premium" ? "warning" : "success"}>{test.accessType}</Badge>
            <Badge tone="outline">{test.type}</Badge>
            <Badge tone="outline">{test.status}</Badge>
          </div>
          <div className="space-y-3">
            <CardTitle className="text-4xl tracking-tight text-foreground">{test.title}</CardTitle>
            <CardDescription className="max-w-3xl text-muted-foreground text-base">{test.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <StartTestModal test={test} />
            <Button asChild variant="outline" className="border-border bg-muted text-foreground hover:bg-muted">
              <Link href={`/tests/${test.id}/start`}>Dedicated start page</Link>
            </Button>
            <Button asChild variant="outline" className="border-border bg-muted text-foreground hover:bg-muted">
              <Link href="/tests">Back to catalog</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Clock3 className="h-5 w-5" />} label="Estimated time" value={`${test.estimatedMinutes} min`} />
        <Metric icon={<FileText className="h-5 w-5" />} label="Questions" value={`${test.questionCount}`} />
        <Metric icon={<FolderOpen className="h-5 w-5" />} label="Source" value={test.source} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Access" value={test.accessType} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Section breakdown</CardTitle>
            <CardDescription>Reading uses 3 passages. Listening uses 4 parts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {test.sections.map((section) => (
              <div key={section.id} className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm text-muted-foreground">{section.teaser}</p>
                </div>
                <Badge tone="outline">{section.questionCount} questions</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versioning and snapshot-ready</CardTitle>
            <CardDescription>
              Editing this published test later will create a new version, while attempts continue to use the frozen test snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent/40 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Start modal foundation</p>
                  <p className="text-sm text-muted-foreground">Scope and mode selection is already wired.</p>
                </div>
              </div>
            </div>
            {listeningMeta ? (
              <div className="rounded-lg border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
                Full Listening exam timing is resolved as audio duration plus two minutes.
                Current scaffold target: {Math.floor(listeningMeta.timeLimitSeconds / 60)} minutes.
              </div>
            ) : null}
            <div className="rounded-lg border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
              The backend will later hydrate the full snapshot, answers, explanations, and attempt metadata here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}
