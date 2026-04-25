"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers3, Play, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { AttemptMode, TestCatalogItem, TestScope } from "@/lib/types";
import { cn } from "@/lib/utils";
import { emitNavigationStart } from "@/lib/navigation-transition";

interface TestStartPageProps {
  test: TestCatalogItem;
}

export function TestStartPage({ test }: TestStartPageProps) {
  const router = useRouter();
  const [scope, setScope] = useState<TestScope>("full");
  const [mode, setMode] = useState<AttemptMode>("practice");
  const [sectionId, setSectionId] = useState(test.sections[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSection = test.sections.find((section) => section.id === sectionId) ?? test.sections[0];
  const isSectionMode = scope === "section";

  async function startAttempt() {
    const targetMode = isSectionMode ? "practice" : mode;
    const destination = test.type === "reading" ? "reading" : "listening";

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/attempts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testId: test.id,
          scope,
          sectionId: isSectionMode ? sectionId : undefined,
          mode: targetMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Attempt start failed.");
      }

      const result = (await response.json()) as { attemptId: string };
      const resumeToken = Date.now();
      if (test.type === "reading") {
        const href = `/exam-preview/reading?attemptId=${result.attemptId}&mode=${targetMode}&resume=${resumeToken}`;
        emitNavigationStart(href);
        router.push(href);
        return;
      }
      const href = `/attempts/${result.attemptId}/${destination}?resume=${resumeToken}`;
      emitNavigationStart(href);
      router.push(href);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="outline">Start route</Badge>
            <Badge tone={test.type === "reading" ? "secondary" : "default"}>{test.type}</Badge>
            <Badge tone={test.accessType === "premium" ? "warning" : "success"}>{test.accessType}</Badge>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{test.title}</h1>
            <p className="text-sm text-muted-foreground">{test.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Questions" value={String(test.questionCount)} />
            <Stat label="Duration" value={`${test.estimatedMinutes} min`} />
            <Stat label="Sections" value={String(test.sections.length)} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Configuration</p>
            <h2 className="text-2xl font-semibold">Choose how to take this test</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ToggleCard
              active={scope === "full"}
              title="Full test"
              description="All sections, practice or exam."
              onClick={() => setScope("full")}
              icon={<Layers3 className="h-4 w-4" />}
            />
            <ToggleCard
              active={scope === "section"}
              title="Part-level"
              description="Single section, practice only."
              onClick={() => setScope("section")}
              icon={<TimerReset className="h-4 w-4" />}
            />
          </div>

          {isSectionMode ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose section</label>
              <Select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
                {test.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title} - {section.questionCount} questions
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode</label>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleCard
                  active={mode === "practice"}
                  title="Practice"
                  description="Flexible timing with review."
                  onClick={() => setMode("practice")}
                  icon={<TimerReset className="h-4 w-4" />}
                />
                <ToggleCard
                  active={mode === "exam"}
                  title="Exam"
                  description="Strict countdown, no pause."
                  onClick={() => setMode("exam")}
                  icon={<Play className="h-4 w-4" />}
                />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-accent/20 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Selection</p>
            <p className="mt-2 text-sm font-medium">
              {isSectionMode ? selectedSection?.title ?? "Section" : `Full ${test.type} test`}
              {" • "}
              {isSectionMode ? "Practice" : mode === "practice" ? "Practice" : "Exam"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                const href = `/tests/${test.id}`;
                emitNavigationStart(href);
                router.push(href);
              }}
            >
              Back to detail
            </Button>
            <Button disabled={isSubmitting} onClick={() => void startAttempt()} className="inline-flex items-center gap-2">
              {isSubmitting ? "Starting..." : "Open attempt"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ToggleCard({
  active,
  title,
  description,
  onClick,
  icon,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition",
        active ? "border-primary bg-primary/10" : "border-border/70 bg-background hover:bg-accent/40",
      )}
    >
      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
