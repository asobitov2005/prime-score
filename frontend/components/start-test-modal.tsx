"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers3, Play, TimerReset } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { TestCatalogItem, TestScope, AttemptMode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StartTestModalProps {
  test: TestCatalogItem;
}

export function StartTestModal({ test }: StartTestModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<TestScope>("full");
  const [mode, setMode] = useState<AttemptMode>("practice");
  const [sectionId, setSectionId] = useState(test.sections[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSection = useMemo(() => test.sections.find((section) => section.id === sectionId) ?? test.sections[0], [sectionId, test.sections]);
  const isSectionMode = scope === "section";
  const isFullTest = test.format === "full";
  const canUseExam = scope === "full" && isFullTest;

  return (
    <>
      <Button onClick={() => setOpen(true)} size="lg" className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
        <Play className="h-5 w-5 mr-2 fill-current" />
        Start Test
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Configure ${test.type} session`}
        description="Select your preferred mode before starting."
      >
        <div className="grid gap-6">
          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Session Scope</label>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleCard
                active={scope === "full"}
                title="Full test"
                description={`Complete 40-question ${test.type} test.`}
                onClick={() => { setScope("full"); if (!isFullTest) setMode("practice"); }}
                icon={<Layers3 className="h-5 w-5" />}
              />
              <ToggleCard
                active={scope === "section"}
                title="Practice passage"
                description="Focus on a specific part or passage."
                onClick={() => { setScope("section"); setMode("practice"); }}
                icon={<TimerReset className="h-5 w-5" />}
              />
            </div>
          </div>

          {isSectionMode ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Select Passage</label>
              <Select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="h-12 rounded-xl border-border bg-muted/30">
                {test.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title || `Passage ${section.number}`}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Select Mode</label>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleCard
                  active={mode === "practice"}
                  title="Practice mode"
                  description="Flexible timer, pause enabled."
                  onClick={() => setMode("practice")}
                  icon={<TimerReset className="h-5 w-5" />}
                />
                <ToggleCard
                  active={mode === "exam"}
                  title="Exam mode"
                  description="Strict timing, no pause."
                  disabled={!canUseExam}
                  onClick={() => setMode("exam")}
                  icon={<Play className="h-5 w-5" />}
                />
              </div>
            </div>
          )}

          {/* Strict Exam Mode Warning */}
          {mode === "exam" && scope === "full" && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-5 rounded-2xl animate-in zoom-in-95 duration-300">
              <div className="flex gap-4">
                <div className="shrink-0 p-2 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-600 dark:text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-red-700 dark:text-red-400 text-sm">Strict Exam Policy</p>
                  <ul className="text-xs text-red-600/80 dark:text-red-400/80 space-y-1.5 list-disc pl-4 font-medium leading-relaxed">
                    <li>The system will enter <strong>Full Screen</strong> mode automatically.</li>
                    <li>You have exactly <strong>60 minutes</strong> (Reading) to finish.</li>
                    <li>If you leave full-screen or switch tabs, the test will <strong>Auto-submit</strong> immediately.</li>
                    <li>No pauses are allowed once the timer starts.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl h-11 px-6 font-bold">
              Cancel
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={async () => {
                const targetMode = scope === "section" ? "practice" : mode;
                const destination = test.type === "reading" ? "reading" : "listening";
                const payload = {
                  testId: test.id,
                  scope,
                  mode: targetMode,
                  sectionId: scope === "section" ? sectionId : undefined
                };

                try {
                  setIsSubmitting(true);
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}/attempts/start`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                  });

                  if (!response.ok) throw new Error("Failed to start.");
                  const result = (await response.json()) as { attempt_id: string };
                  setOpen(false);
                  router.push(`/attempts/${result.attempt_id}/${destination}`);
                } catch (err) {
                   console.error(err);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="rounded-xl h-11 px-8 font-black shadow-md hover:shadow-lg transition-all"
            >
              {isSubmitting ? "Preparing..." : "Begin Practice"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function ToggleCard({
  active,
  title,
  description,
  onClick,
  icon,
  disabled
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition",
        active ? "border-primary bg-primary/10" : "border-border/70 bg-background hover:bg-accent/40",
        disabled && "cursor-not-allowed opacity-60"
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
