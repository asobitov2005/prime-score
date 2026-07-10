"use client";

import { Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { StartTestModalController } from "./start-test-modal-types";

interface StartTestRulesDialogProps {
  controller: StartTestModalController;
}

export function StartTestRulesDialog({
  controller,
}: StartTestRulesDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-rose-400" />
        <div className="space-y-5 p-5 pt-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Strict Exam Rules
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This mode simulates a real exam. Focus is strictly monitored.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-red-500">
              Auto-submit triggers:
            </p>
            <ul className="space-y-2 text-xs font-medium text-foreground">
              {[
                "Leaving Full Screen mode",
                "Switching Tabs or Windows",
                "Opening other apps over the test",
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-2 leading-tight">
                  <div className="mt-0.5 shrink-0 rounded-full bg-red-500/20 p-0.5">
                    <X className="h-2.5 w-2.5 text-red-500" />
                  </div>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              disabled={controller.isSubmitting}
              onClick={() => void controller.startTest("exam")}
              className="h-10 w-full rounded-xl bg-foreground text-sm font-bold text-background shadow-sm transition-all hover:bg-foreground/90"
            >
              {controller.isSubmitting
                ? "Starting..."
                : "I understand, start test"}
            </Button>
            <Button
              variant="ghost"
              onClick={controller.closeRulesDialog}
              className="h-10 w-full rounded-xl text-xs font-semibold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
