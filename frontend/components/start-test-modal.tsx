"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Play, TimerReset, X, ArrowRight, Zap, ShieldAlert, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TestCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StartTestModalProps {
  test: TestCatalogItem;
}

export function StartTestModal({ test }: StartTestModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  async function startTest(mode: "exam" | "practice") {
    const destination = test.type === "reading" ? "reading" : "listening";
    const payload = {
      testId: test.id,
      scope: "full",
      mode: mode,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api"}/attempts/start`, {
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
  }

  const ModalContent = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/50 bg-background/80 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <button 
          onClick={() => setOpen(false)}
          className="absolute top-5 right-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 md:p-8 space-y-6 pt-8 md:pt-10">
          <div className="flex justify-between items-start pr-8">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md shadow-sm",
                  test.type === "reading" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  {test.type}
                </span>
                <span className="bg-muted/50 text-muted-foreground px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border border-border/50">
                  Full Test
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground leading-tight">{test.title}</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="group relative border-border/60 bg-card/40 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
              <CardHeader className="pt-6 pb-3 items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 shadow-sm">
                  <TimerReset className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Practice Mode</CardTitle>
              </CardHeader>
              <CardContent className="pb-6 px-5 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs font-medium text-muted-foreground/90 mb-5 text-left">
                    <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Flexible practice</li>
                    <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Timer available</li>
                    <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Pause allowed</li>
                    <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Review with less pressure</li>
                    <li className="flex items-start gap-2"><Check className="text-emerald-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Best for learning and improvement</li>
                </ul>
                <Button disabled={isSubmitting} onClick={() => startTest("practice")} className="w-full h-10 rounded-lg font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all group-hover:-translate-y-0.5 mt-auto border-0 z-10 relative">
                    {isSubmitting ? "Starting..." : "Start Practice"}
                </Button>
              </CardContent>
            </Card>

            <Card className="group relative border-border/60 bg-card/40 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm z-10 font-mono">Strict</div>
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
              <CardHeader className="pt-6 pb-3 items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 shadow-sm">
                  <Play className="h-6 w-6 fill-current" />
                </div>
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Strict Exam Mode</CardTitle>
              </CardHeader>
              <CardContent className="pb-6 px-5 flex-1 flex flex-col justify-between">
                <ul className="space-y-2.5 text-xs font-medium text-muted-foreground/90 mb-5 text-left">
                    <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Real exam conditions</li>
                    <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Full timer</li>
                    <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> No pause</li>
                    <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Tab switching may end test</li>
                    <li className="flex items-start gap-2"><Check className="text-red-500 h-3.5 w-3.5 mt-0.5 shrink-0" /> Best for realistic simulation</li>
                </ul>
                <Button variant="destructive" disabled={isSubmitting} onClick={() => startTest("exam")} className="w-full h-10 rounded-lg font-bold text-sm shadow-md shadow-red-500/20 transition-all group-hover:-translate-y-0.5 mt-auto border-0 z-10 relative">
                    {isSubmitting ? "Starting..." : "Start Exam"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
              Redirection to workspace activated
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="w-full h-9 text-xs font-bold rounded-lg shadow-sm group/btn transition-all active:scale-95">
        Start Practice
        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
      </Button>

      {mounted && open && createPortal(<ModalContent />, document.body)}
    </>
  );
}
