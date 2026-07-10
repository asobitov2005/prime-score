"use client";

import { Check, Play, TimerReset, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { StartTestModalController } from "./start-test-modal-types";

interface StartTestChoiceDialogProps {
  controller: StartTestModalController;
}

export function StartTestChoiceDialog({
  controller,
}: StartTestChoiceDialogProps) {
  const {
    test,
    isSubmitting,
    isAuthenticated,
    startError,
    closeChoiceDialog,
    handleStartExamChoice,
    startTest,
  } = controller;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/50 bg-background/80 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in zoom-in-95 duration-300">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />
        <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <button
          onClick={closeChoiceDialog}
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Close"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-6 p-6 pt-8 md:p-8 md:pt-10">
          {startError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {startError}
            </div>
          ) : null}
          <div className="flex items-start justify-between pr-8">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm",
                    test.type === "reading"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-emerald-500/10 text-emerald-500",
                  )}
                >
                  {test.type}
                </span>
                <span className="rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Full Test
                </span>
              </div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                {test.title}
              </h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ModeCard
              tone="practice"
              title="Practice Mode"
              icon={<TimerReset className="h-6 w-6" />}
              features={[
                "Flexible practice",
                "Timer available",
                "Pause allowed",
                "Review with less pressure",
                "Best for learning",
              ]}
              buttonLabel={isSubmitting ? "Starting..." : "Start Practice"}
              disabled={isSubmitting}
              onClick={() => startTest("practice")}
            />
            <ModeCard
              tone="exam"
              title="Strict Exam Mode"
              icon={<Play className="h-6 w-6 fill-current" />}
              features={[
                "Real exam conditions",
                "Full timer",
                "No pause",
                "Tab switching may end test",
                "Realistic simulation",
              ]}
              buttonLabel={
                isAuthenticated ? "Select Exam Mode" : "Login for Exam Mode"
              }
              disabled={isSubmitting}
              onClick={handleStartExamChoice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModeCardProps {
  tone: "practice" | "exam";
  title: string;
  icon: React.ReactNode;
  features: string[];
  buttonLabel: string;
  disabled: boolean;
  onClick: () => void;
}

function ModeCard(props: ModeCardProps) {
  const exam = props.tone === "exam";
  return (
    <Card className="group relative flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-sm transition-all">
      {exam ? (
        <div className="absolute right-0 top-0 z-10 rounded-bl-xl bg-red-500 px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
          Strict
        </div>
      ) : null}
      <div
        className={cn(
          "absolute left-0 top-0 h-1 w-full",
          exam ? "bg-red-500/20" : "bg-primary/20",
        )}
      />
      <CardHeader className="items-center pb-3 pt-6 text-center">
        <div
          className={cn(
            "mb-3 flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-all duration-500 group-hover:scale-110",
            exam
              ? "bg-red-500/10 text-red-500"
              : "bg-primary/10 text-primary",
          )}
        >
          {props.icon}
        </div>
        <CardTitle className="text-lg font-bold tracking-tight text-foreground">
          {props.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between px-5 pb-6">
        <ul className="mb-5 space-y-2.5 text-left text-xs font-medium text-muted-foreground/90">
          {props.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  exam ? "text-red-500" : "text-emerald-500",
                )}
              />
              {feature}
            </li>
          ))}
        </ul>
        <Button
          variant={exam ? "destructive" : "default"}
          disabled={props.disabled}
          onClick={props.onClick}
          className={cn(
            "relative z-10 mt-auto h-10 w-full rounded-lg border-0 text-sm font-bold shadow-md transition-all group-hover:-translate-y-0.5",
            exam
              ? "shadow-red-500/20"
              : "bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700 dark:text-slate-950",
          )}
        >
          {props.buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
