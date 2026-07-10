"use client";
import type { MicrophoneCheckClientScope } from "./controller";
import { ArrowLeft, ClipboardCheck, Lightbulb, Link } from "../dependencies";
import { BottomFeatureStrip, ChecklistCard, MicrophoneTestCard, beforeStart, whatWeCheck } from "../shared";

export function MicrophoneCheckClientView1({ scope }: { scope: MicrophoneCheckClientScope }) {
  const { micState, permissionState, quality, connection, inputLevel, bars, startMic, handleStart, speakingTestId, isStarting, startError } = scope;
  return (
    (
        <main className="speaking-night animate-in fade-in duration-500 text-slate-950 dark:text-slate-50 lg:h-[calc(100svh-1rem)] lg:overflow-hidden">
          <div className="space-y-3 pb-2 lg:pb-0">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-2xl">
                  Check your microphone before you start
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500 dark:text-slate-400">
                  Make sure your voice is clear so the AI examiner can hear you accurately.
                </p>
              </div>
    
              <Link
                href="/speaking"
                className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Back to Speaking
              </Link>
            </header>
    
            <section className="grid gap-3 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,1fr)]">
              <MicrophoneTestCard
                micState={micState}
                permissionState={permissionState}
                quality={quality}
                connection={connection}
                inputLevel={inputLevel}
                bars={bars}
                onTestAgain={startMic}
                onStart={handleStart}
                canCreateSession={Boolean(speakingTestId)}
                isStarting={isStarting}
                startError={startError}
              />
    
              <aside className="grid gap-3">
                <ChecklistCard title="What we check" icon={ClipboardCheck} items={whatWeCheck} className="lg:min-h-[188px]" />
                <ChecklistCard title="Before you start" icon={Lightbulb} items={beforeStart} className="lg:min-h-[204px]" />
              </aside>
            </section>
    
            <BottomFeatureStrip />
          </div>
        </main>
      )
  );
}
